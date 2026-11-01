export interface OrderLineInput {
  unitPriceCents: number;
  quantity: number;
}

export interface OrderTotalsInput {
  lines: readonly OrderLineInput[];
  deliveryFeeCents: number;
  serviceFeeCents?: number;
  discountCents?: number;
}

export interface OrderTotals {
  subtotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  discountCents: number;
  totalCents: number;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer in cents`);
  }
}

export function calculateOrderTotals(input: OrderTotalsInput): OrderTotals {
  if (input.lines.length === 0) {
    throw new RangeError("An order must contain at least one line");
  }

  let subtotalCents = 0;
  for (const [index, line] of input.lines.entries()) {
    assertNonNegativeInteger(line.unitPriceCents, `lines[${index}].unitPriceCents`);
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
      throw new RangeError(`lines[${index}].quantity must be an integer between 1 and 99`);
    }
    subtotalCents += line.unitPriceCents * line.quantity;
    if (!Number.isSafeInteger(subtotalCents)) {
      throw new RangeError("Order subtotal exceeds the safe integer range");
    }
  }

  const deliveryFeeCents = input.deliveryFeeCents;
  const serviceFeeCents = input.serviceFeeCents ?? 0;
  const discountCents = input.discountCents ?? 0;
  assertNonNegativeInteger(deliveryFeeCents, "deliveryFeeCents");
  assertNonNegativeInteger(serviceFeeCents, "serviceFeeCents");
  assertNonNegativeInteger(discountCents, "discountCents");

  const gross = subtotalCents + deliveryFeeCents + serviceFeeCents;
  if (discountCents > gross) {
    throw new RangeError("Discount cannot exceed the gross order amount");
  }

  return {
    subtotalCents,
    deliveryFeeCents,
    serviceFeeCents,
    discountCents,
    totalCents: gross - discountCents,
  };
}
