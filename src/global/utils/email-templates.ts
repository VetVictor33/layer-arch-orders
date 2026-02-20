/**
 * Email template definitions
 */

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface OrderCreatedTemplate extends EmailTemplate {
  orderId: string;
  customerName: string;
  productId: string;
  price: number;
}

export interface OrderPaidTemplate extends EmailTemplate {
  orderId: string;
  customerName: string;
  amount: number;
  paymentId: string;
}

export interface PaymentDeniedTemplate extends EmailTemplate {
  orderId: string;
  customerName: string;
  amount: number;
  reason: string;
}

/**
 * Email template generators
 */
export class EmailTemplateGenerator {
  static generateOrderCreatedTemplate(
    customerName: string,
    orderId: string,
    productId: string,
    price: number,
  ): OrderCreatedTemplate {
    return {
      orderId,
      customerName,
      productId,
      price,
      subject: `Order Confirmation - Order #${orderId}`,
      body: `
Dear ${customerName},

Thank you for your order!

Order Details:
- Order ID: ${orderId}
- Product ID: ${productId}
- Amount: $${price.toFixed(2)}

We have received your order and will process your payment shortly.

Best regards,
Orders Team
      `.trim(),
    };
  }

  static generateOrderPaidTemplate(
    customerName: string,
    orderId: string,
    paymentId: string,
    amount: number,
  ): OrderPaidTemplate {
    return {
      orderId,
      customerName,
      amount,
      paymentId,
      subject: `Payment Confirmation - Order #${orderId}`,
      body: `
Dear ${customerName},

Your payment has been successfully processed!

Order Details:
- Order ID: ${orderId}
- Payment ID: ${paymentId}
- Amount: $${amount.toFixed(2)}

Your order is now confirmed and will be fulfilled shortly.

Best regards,
Orders Team
      `.trim(),
    };
  }

  static generatePaymentDeniedTemplate(
    customerName: string,
    orderId: string,
    amount: number,
    reason: string,
  ): PaymentDeniedTemplate {
    return {
      orderId,
      customerName,
      amount,
      reason,
      subject: `Payment Failed - Order #${orderId}`,
      body: `
Dear ${customerName},

Unfortunately, your payment for order #${orderId} was not processed successfully.

Order Details:
- Order ID: ${orderId}
- Amount: $${amount.toFixed(2)}
- Reason: ${reason}

Please try again with a different payment method or contact our support team for assistance.

Best regards,
Orders Team
      `.trim(),
    };
  }
}
