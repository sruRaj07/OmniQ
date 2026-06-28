/**
 * OmniQ order service - order event publisher.
 * Author: OmniQ Team
 */
export type OrderEvent = {
  orderId: string;
  status: string;
  emittedAt: string;
};

export function emitOrderStatusChanged(orderId: string, status: string): OrderEvent {
  return { orderId, status, emittedAt: new Date().toISOString() };
}
