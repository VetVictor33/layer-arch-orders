import {
  Queue,
  Worker,
  QueueEvents,
  type Job,
  type BackoffOptions,
  type JobsOptions,
} from "bullmq";
import { getEnv } from "@/env.js";
import { logger } from "@/libs/logger.js";
import type { QueueNameType } from "@/libs/queues.js";

interface RedisConfig {
  host: string;
  port: number;
  password: string;
  maxRetriesPerRequest?: number | null;
}

/**
 * BullMQ Queue Manager
 * Manages job queues using BullMQ with Redis
 * Note: ioredis is managed by BullMQ internally as a transitive dependency
 */
export default class QueueManager {
  private redisConfig: RedisConfig;
  private queues: Map<QueueNameType, Queue>;
  private workers: Map<QueueNameType, Worker>;
  private queueEvents: Map<string, QueueEvents>;

  private defaultMaxAttempts: number;
  private defaultDelay: number;
  private defaultBackoff: BackoffOptions;

  private static instance: QueueManager;

  private constructor(config: RedisConfig) {
    this.redisConfig = config;
    this.queues = new Map();
    this.workers = new Map();
    this.queueEvents = new Map();

    this.defaultMaxAttempts = 3;
    this.defaultDelay = 0;
    this.defaultBackoff = {
      type: "exponential",
      delay: 1000,
      jitter: 0.5,
    };

    logger.info(
      { host: config.host, port: config.port },
      "QueueManager initialized",
    );
  }

  /**
   * Get singleton instance of QueueManager
   */
  static getInstance(config?: RedisConfig): QueueManager {
    if (!QueueManager.instance) {
      const environment = getEnv();
      const defaultConfig: RedisConfig = {
        host: environment.REDIS_HOST,
        port: environment.REDIS_PORT,
        password: environment.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
      };

      QueueManager.instance = new QueueManager(config || defaultConfig);
    }

    return QueueManager.instance;
  }

  /**
   * Create or get a queue
   */
  getQueue<T = any>(queueName: QueueNameType): Queue<T> {
    if (!this.queues.has(queueName)) {
      const queue = new Queue<T>(queueName, {
        connection: this.redisConfig,
      });

      this.queues.set(queueName, queue);
    }

    return this.queues.get(queueName) as Queue<T>;
  }

  /**
   * Register a worker for a specific queue
   */
  registerWorker<T = any, R = any>(
    queueName: QueueNameType,
    processor: (job: Job<T, R>) => Promise<R>,
    options?: { concurrency?: number },
  ): Worker<T, R> {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName) as Worker<T>;
    }

    const worker = new Worker<T, R>(queueName, processor, {
      connection: this.redisConfig,
      concurrency: options?.concurrency || 1,
    });

    worker.on("completed", (job) => {
      logger.info({ jobId: job.id, queueName }, "Job completed");
    });

    worker.on("failed", (job, err) => {
      logger.error(
        { jobId: job?.id, queueName, error: err.message },
        "Job failed",
      );
    });

    this.workers.set(queueName, worker);
    return worker;
  }

  /**
   * Add a job to a queue
   */
  async addJob<T = any>(
    queueName: QueueNameType,
    data: T,
    options?: JobsOptions,
  ): Promise<string> {
    const queue = this.getQueue(queueName);

    const job = await queue.add(queueName, data, {
      delay: options?.delay || this.defaultDelay,
      attempts: options?.attempts || this.defaultMaxAttempts,
      backoff: options?.backoff || this.defaultBackoff,
    });

    return job.id as string;
  }

  /**
   * Get queue events listener
   */
  getQueueEvents(queueName: QueueNameType): QueueEvents {
    if (!this.queueEvents.has(queueName)) {
      const queueEvents = new QueueEvents(queueName, {
        connection: this.redisConfig,
      });

      this.queueEvents.set(queueName, queueEvents);
    }

    return this.queueEvents.get(queueName) as QueueEvents;
  }

  /**
   * Listen to queue events
   */
  onQueueEvent(
    queueName: QueueNameType,
    event: "completed" | "failed" | "progress",
    callback: (jobId: string, data?: any) => void,
  ): void {
    const queueEvents = this.getQueueEvents(queueName);

    queueEvents.on(event, ({ jobId, data }: { jobId: string; data?: any }) => {
      callback(jobId, data);
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(
    queueName: QueueNameType,
    jobId: string,
  ): Promise<string | null> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) return null;

    const state = await job.getState();
    return state;
  }

  /**
   * Clear all jobs from a queue
   */
  async clearQueue(queueName: QueueNameType): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.drain();
  }

  /**
   * Close all connections
   */
  async disconnect(): Promise<void> {
    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    // Close all queue events
    for (const queueEvents of this.queueEvents.values()) {
      await queueEvents.close();
    }

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }

    logger.info("QueueManager disconnected");
  }
}
