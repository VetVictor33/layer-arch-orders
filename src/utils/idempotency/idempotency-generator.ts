interface IdempotencyArgs {
  customerName: string;
  customerEmail: string;
  productPrice: number;
  productId: string;
}

export function orderCreationIdempotencyKeyGenerator(
  args: IdempotencyArgs,
): string {
  const unparsedKey = `${args.customerName}(${args.customerEmail})-[${args.productId}]-${args.productPrice}`;

  const parsedKey = unparsedKey.replaceAll(" ", "").toLowerCase();
  return parsedKey;
}
