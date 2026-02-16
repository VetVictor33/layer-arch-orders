import { AppError } from "@/global/errors/AppError.js";
import { RepositoryBase } from "./RepositoryBase.js";
import type {
  Order,
  PaymentStatus,
  PaymentType,
} from "@/generated/prisma/client.js";

export interface CreateOrderDTO {
  productId: string;
  price: number;
  customerName: string;
  customerEmail: string;
  paymentType: PaymentType;
  paymentId?: string;
  gatewayId?: string;
  paymentStatus: PaymentStatus;
}

export interface UpdateOrderDTO {
  paymentId?: string;
  gatewayId?: string;
  paymentStatus?: PaymentStatus;
}

export class OrderRepository extends RepositoryBase<Order> {
  async create(data: CreateOrderDTO): Promise<Order> {
    return this.prisma.order.create({
      data,
    });
  }

  async update(id: string, data: UpdateOrderDTO): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    return this.throwNotImplemented()!;
  }

  async findByEmail(email: string): Promise<Order[]> {
    return this.throwNotImplemented()!;
  }

  async findByPaymentStatus(status: PaymentStatus): Promise<Order[]> {
    return this.throwNotImplemented()!;
  }

  private throwNotImplemented() {
    throw new AppError(500, "Not implemented");
  }
}
