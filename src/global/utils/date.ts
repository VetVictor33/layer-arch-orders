export type timestamp = number;

/**
 * Centralized Date handling utility class
 */
export class DateUtils {
  /**
   * Transform timestamp (milliseconds) into a comprehensive UTC date string
   * @param ts - Timestamp in milliseconds (e.g., from Date.now())
   * @returns ISO 8601 formatted UTC date string (e.g., 2026-02-17T14:30:45.123Z)
   */
  static toUtcDate(ts: timestamp): string {
    return new Date(ts).toISOString();
  }

  /**
   * Get current timestamp
   * @returns Current timestamp in milliseconds
   */
  static now(): timestamp {
    return Date.now() as timestamp;
  }

  /**
   * Add milliseconds to a timestamp
   * @param ts - Base timestamp in milliseconds
   * @param ms - Milliseconds to add
   * @returns New timestamp
   */
  static addMilliseconds(ts: timestamp, ms: number): timestamp {
    return (ts + ms) as timestamp;
  }

  /**
   * Add seconds to a timestamp
   * @param ts - Base timestamp in milliseconds
   * @param seconds - Seconds to add
   * @returns New timestamp
   */
  static addSeconds(ts: timestamp, seconds: number): timestamp {
    return (ts + seconds * 1000) as timestamp;
  }

  /**
   * Add minutes to a timestamp
   * @param ts - Base timestamp in milliseconds
   * @param minutes - Minutes to add
   * @returns New timestamp
   */
  static addMinutes(ts: timestamp, minutes: number): timestamp {
    return (ts + minutes * 60 * 1000) as timestamp;
  }

  /**
   * Add hours to a timestamp
   * @param ts - Base timestamp in milliseconds
   * @param hours - Hours to add
   * @returns New timestamp
   */
  static addHours(ts: timestamp, hours: number): timestamp {
    return (ts + hours * 60 * 60 * 1000) as timestamp;
  }

  /**
   * Add days to a timestamp
   * @param ts - Base timestamp in milliseconds
   * @param days - Days to add
   * @returns New timestamp
   */
  static addDays(ts: timestamp, days: number): timestamp {
    return (ts + days * 24 * 60 * 60 * 1000) as timestamp;
  }

  /**
   * Get difference in seconds between two timestamps
   * @param ts1 - First timestamp in milliseconds
   * @param ts2 - Second timestamp in milliseconds
   * @returns Difference in seconds
   */
  static diffInSeconds(ts1: timestamp, ts2: timestamp): number {
    return Math.floor(Math.abs(ts1 - ts2) / 1000);
  }

  /**
   * Check if timestamp is in the past
   * @param ts - Timestamp in milliseconds
   * @returns True if timestamp is before now
   */
  static isPast(ts: timestamp): boolean {
    return ts < Date.now();
  }

  /**
   * Check if timestamp is in the future
   * @param ts - Timestamp in milliseconds
   * @returns True if timestamp is after now
   */
  static isFuture(ts: timestamp): boolean {
    return ts > Date.now();
  }
}
