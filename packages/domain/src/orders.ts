export const ORDER_STATUSES = [
  "pending_merchant",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "courier_assigned",
  "picked_up",
  "delivered",
  "rejected",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TERMINAL = new Set<OrderStatus>(["delivered", "rejected", "cancelled"]);

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_merchant: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["courier_assigned", "delivered", "cancelled"],
  courier_assigned: ["picked_up", "cancelled"],
  picked_up: ["delivered"],
  delivered: [],
  rejected: [],
  cancelled: [],
};

export class InvalidOrderTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid order transition: ${from} -> ${to}`);
    this.name = "InvalidOrderTransitionError";
  }
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new InvalidOrderTransitionError(from, to);
  }
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL.has(status);
}

export function nextOrderStatuses(status: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[status];
}
