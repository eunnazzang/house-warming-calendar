import type { PublicSlot } from "./types";

export type SlotStatus = "open" | "last" | "full";

export function slotStatus(s: Pick<PublicSlot, "capacity" | "booked" | "closed">): SlotStatus {
  const left = s.capacity - s.booked;
  if (s.closed || left <= 0) return "full";
  return left === 1 ? "last" : "open";
}

export const STATUS_STYLE: Record<SlotStatus, string> = {
  open: "bg-ok-soft text-ok border-ok/30",
  last: "bg-warn-soft text-warn border-warn/40",
  full: "bg-off-soft text-off border-off/30",
};

export const STATUS_DOT: Record<SlotStatus, string> = {
  open: "bg-ok",
  last: "bg-warn",
  full: "bg-off",
};
