import { describe, expect, it } from "vitest";
import {
  assertOrderTransition,
  canTransitionOrder,
  isTerminalOrderStatus,
  nextOrderStatuses,
} from "./orders";
import { calculateOrderTotals } from "./money";

describe("order lifecycle", () => {
  it("allows the normal fulfilment progression", () => {
    expect(canTransitionOrder("pending_merchant", "accepted")).toBe(true);
    expect(canTransitionOrder("accepted", "preparing")).toBe(true);
    expect(canTransitionOrder("preparing", "ready_for_pickup")).toBe(true);
    expect(canTransitionOrder("ready_for_pickup", "courier_assigned")).toBe(true);
    expect(canTransitionOrder("courier_assigned", "picked_up")).toBe(true);
    expect(canTransitionOrder("picked_up", "delivered")).toBe(true);
  });

  it("rejects impossible transitions", () => {
    expect(() => assertOrderTransition("delivered", "preparing")).toThrow("Invalid order transition");
    expect(canTransitionOrder("pending_merchant", "delivered")).toBe(false);
  });

  it("identifies terminal states", () => {
    expect(isTerminalOrderStatus("delivered")).toBe(true);
    expect(isTerminalOrderStatus("rejected")).toBe(true);
    expect(isTerminalOrderStatus("preparing")).toBe(false);
    expect(nextOrderStatuses("delivered")).toEqual([]);
  });
});

describe("money", () => {
  it("calculates in integer cents without floating point", () => {
    expect(calculateOrderTotals({
      lines: [
        { unitPriceCents: 1099, quantity: 2 },
        { unitPriceCents: 250, quantity: 1 },
      ],
      deliveryFeeCents: 199,
      serviceFeeCents: 0,
      discountCents: 100,
    })).toEqual({
      subtotalCents: 2448,
      deliveryFeeCents: 199,
      serviceFeeCents: 0,
      discountCents: 100,
      totalCents: 2547,
    });
  });

  it("rejects negative prices and fractional quantities", () => {
    expect(() => calculateOrderTotals({
      lines: [{ unitPriceCents: -10, quantity: 1 }],
      deliveryFeeCents: 0,
    })).toThrow();
    expect(() => calculateOrderTotals({
      lines: [{ unitPriceCents: 100, quantity: 1.5 }],
      deliveryFeeCents: 0,
    })).toThrow();
  });

  it("rejects discounts larger than the basket", () => {
    expect(() => calculateOrderTotals({
      lines: [{ unitPriceCents: 100, quantity: 1 }],
      deliveryFeeCents: 0,
      discountCents: 101,
    })).toThrow();
  });
});
