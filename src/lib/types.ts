import type { Menu, Period, Team } from "./constants";

/** 게스트에게 보내는 슬롯 정보. 예약자 정보는 절대 넣지 않아요. */
export type PublicSlot = {
  id: number;
  date: string;
  period: Period;
  capacity: number;
  booked: number;
  closed: boolean;
  start: string;
  end: string;
};

export type Reservation = {
  id: number;
  slotId: number;
  date: string;
  period: Period;
  name: string;
  phone: string;
  teams: Team[];
  menu: Menu;
  memo: string;
  carNumber: string;
  changeRequested: boolean;
  changeNote: string;
  changeRequestedAt: string | null;
  createdAt: string;
};

/** 예약한 본인에게만 보여 주는 내 예약 */
export type MyReservation = Omit<Reservation, "id" | "slotId"> & {
  start: string;
  end: string;
};
