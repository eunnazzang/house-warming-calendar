import { randomBytes } from "crypto";
import type postgres from "postgres";
import { db } from "./db";
import { MENUS, TEAMS, type Menu, type Period, type Team } from "./constants";
import { todayKST } from "./date";
import { isValidPhone, normalizePhone } from "./phone";
import { getSettings } from "./settings";
import { slotTimes } from "./slots";
import type { MyReservation, Reservation } from "./types";

export class BookingError extends Error {
  constructor(
    public code: "invalid" | "not_found" | "past" | "closed" | "full" | "duplicate",
    message: string,
  ) {
    super(message);
  }
}

export const BOOKING_STATUS: Record<BookingError["code"], number> = {
  invalid: 400,
  not_found: 404,
  past: 409,
  closed: 409,
  full: 409,
  duplicate: 409,
};

export type ReservationInput = {
  name: string;
  phone: string;
  teams: Team[];
  menu: Menu;
  memo: string;
  carNumber: string;
};

export function validateInput(body: Record<string, unknown>): ReservationInput {
  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  const teams = Array.isArray(body.teams)
    ? TEAMS.filter((t) => (body.teams as unknown[]).includes(t))
    : [];
  const menu = String(body.menu ?? "") as Menu;
  const memo = String(body.memo ?? "").trim();
  const carNumber = String(body.carNumber ?? "").trim();

  if (!name) throw new BookingError("invalid", "이름을 입력해 주세요.");
  if (name.length > 30) throw new BookingError("invalid", "이름은 30자까지 입력할 수 있어요.");
  if (!isValidPhone(phone)) throw new BookingError("invalid", "연락처를 010-1234-5678 형식으로 입력해 주세요.");
  if (!teams.length) throw new BookingError("invalid", "어느 팀인지 하나 이상 골라 주세요.");
  if (!MENUS.includes(menu)) throw new BookingError("invalid", "선호 메뉴를 하나 골라 주세요.");
  if (memo.length > 500) throw new BookingError("invalid", "메모는 500자까지 입력할 수 있어요.");
  if (carNumber.length > 20) throw new BookingError("invalid", "차량번호가 너무 길어요.");
  return { name, phone, teams, menu, memo, carNumber };
}

type SlotLock = { id: string; date: string; capacity: number; is_closed: boolean };

async function lockSlot(sql: postgres.TransactionSql, slotId: number): Promise<SlotLock> {
  // 같은 슬롯에 동시에 들어온 예약은 이 잠금에서 한 줄로 세워져요
  const [slot] = await sql<SlotLock[]>`
    select id, date, capacity, is_closed from slots where id = ${slotId} for update
  `;
  if (!slot) throw new BookingError("not_found", "없는 슬롯이에요.");
  return slot;
}

async function bookedCount(sql: postgres.TransactionSql, slotId: number, excludeId = 0): Promise<number> {
  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int as count from reservations where slot_id = ${slotId} and id <> ${excludeId}
  `;
  return count;
}

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

export async function createReservation(slotId: number, input: ReservationInput) {
  const token = randomBytes(18).toString("base64url");
  try {
    return await db().begin(async (sql) => {
      const slot = await lockSlot(sql, slotId);
      if (slot.date < todayKST()) throw new BookingError("past", "지난 날짜는 예약할 수 없어요.");
      if (slot.capacity <= 0 || slot.is_closed) throw new BookingError("closed", "예약을 받지 않는 슬롯이에요.");
      if ((await bookedCount(sql, slotId)) >= slot.capacity) {
        throw new BookingError("full", "아쉽지만 방금 마감되었어요.");
      }
      const [row] = await sql<{ id: string }[]>`
        insert into reservations (slot_id, name, phone, teams, menu, memo, car_number, access_token)
        values (${slotId}, ${input.name}, ${input.phone}, ${input.teams}, ${input.menu},
                ${input.memo}, ${input.carNumber}, ${token})
        returning id
      `;
      return { id: Number(row.id), token };
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new BookingError("duplicate", "같은 이름과 연락처로 이미 이 슬롯에 예약하셨어요.");
    }
    throw e;
  }
}

type ReservationRow = {
  id: string;
  slot_id: string;
  date: string;
  period: Period;
  name: string;
  phone: string;
  teams: Team[];
  menu: Menu;
  memo: string;
  car_number: string;
  change_requested: boolean;
  change_note: string;
  change_requested_at: Date | null;
  created_at: Date;
  start_time: string | null;
  end_time: string | null;
};

function toReservation(r: ReservationRow): Reservation {
  return {
    id: Number(r.id),
    slotId: Number(r.slot_id),
    date: r.date,
    period: r.period,
    name: r.name,
    phone: r.phone,
    teams: r.teams,
    menu: r.menu,
    memo: r.memo,
    carNumber: r.car_number,
    changeRequested: r.change_requested,
    changeNote: r.change_note,
    changeRequestedAt: r.change_requested_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
  };
}

const SELECT_RESERVATION = (sql: postgres.Sql) => sql`
  select r.*, s.date, s.period, s.start_time, s.end_time
  from reservations r join slots s on s.id = r.slot_id
`;

/** 어드민 전용: 전체 예약 */
export async function listReservations(): Promise<Reservation[]> {
  const sql = db();
  const rows = await sql<ReservationRow[]>`
    ${SELECT_RESERVATION(sql)}
    order by s.date, s.period desc, r.created_at
  `;
  return rows.map(toReservation);
}

/** 예약한 본인 전용: 비밀 링크로 내 예약 하나 */
export async function getMyReservation(token: string): Promise<MyReservation | null> {
  const sql = db();
  const [rows, settings] = await Promise.all([
    sql<ReservationRow[]>`${SELECT_RESERVATION(sql)} where r.access_token = ${token}`,
    getSettings(),
  ]);
  const r = rows[0];
  if (!r) return null;
  // id 같은 내부 값은 빼고 돌려줘요
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, slotId, ...rest } = toReservation(r);
  return { ...rest, ...slotTimes(r.period, r, settings) };
}

/** 이름 + 연락처로 내 예약 링크 찾기 */
export async function findMyTokens(name: string, phone: string) {
  const rows = await db()<{ access_token: string; date: string; period: Period }[]>`
    select r.access_token, s.date, s.period
    from reservations r join slots s on s.id = r.slot_id
    where r.name = ${name.trim()} and r.phone = ${normalizePhone(phone)}
    order by s.date, s.period desc
  `;
  return rows.map((r) => ({ token: r.access_token, date: r.date, period: r.period }));
}

export async function requestChange(token: string, note: string): Promise<boolean> {
  const rows = await db()`
    update reservations
    set change_requested = true, change_note = ${note.trim().slice(0, 500)}, change_requested_at = now()
    where access_token = ${token}
    returning id
  `;
  return rows.length > 0;
}

export async function resolveChange(id: number): Promise<boolean> {
  const rows = await db()`
    update reservations set change_requested = false where id = ${id} returning id
  `;
  return rows.length > 0;
}

export async function deleteReservation(id: number): Promise<boolean> {
  const rows = await db()`delete from reservations where id = ${id} returning id`;
  return rows.length > 0;
}

/** 어드민 수정. 슬롯을 옮기면 옮길 슬롯의 정원을 다시 확인해요. */
export async function updateReservation(
  id: number,
  slotId: number,
  input: ReservationInput,
  force: boolean,
): Promise<boolean> {
  try {
    return await db().begin(async (sql) => {
      const [current] = await sql<{ slot_id: string }[]>`
        select slot_id from reservations where id = ${id} for update
      `;
      if (!current) return false;
      if (Number(current.slot_id) !== slotId) {
        const slot = await lockSlot(sql, slotId);
        if (!force && (await bookedCount(sql, slotId, id)) >= slot.capacity) {
          throw new BookingError("full", "옮기려는 슬롯의 정원이 다 찼어요.");
        }
      }
      await sql`
        update reservations set
          slot_id = ${slotId}, name = ${input.name}, phone = ${input.phone}, teams = ${input.teams},
          menu = ${input.menu}, memo = ${input.memo}, car_number = ${input.carNumber}
        where id = ${id}
      `;
      return true;
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new BookingError("duplicate", "그 슬롯에 같은 이름과 연락처의 예약이 이미 있어요.");
    }
    throw e;
  }
}
