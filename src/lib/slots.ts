import { db } from "./db";
import type { Period } from "./constants";
import { DEFAULT_PATTERN } from "./constants";
import { addDays, weekday } from "./date";
import { getSettings, type Settings } from "./settings";
import type { PublicSlot } from "./types";

type SlotRow = {
  id: string;
  date: string;
  period: Period;
  capacity: number;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  booked: number;
};

export function slotTimes(
  period: Period,
  row: { start_time: string | null; end_time: string | null },
  s: Settings,
) {
  const start = row.start_time || (period === "lunch" ? s.lunchStart : s.dinnerStart);
  const end = row.end_time || (period === "lunch" ? s.lunchEnd : s.dinnerEnd);
  return { start, end };
}

function toSlot(row: SlotRow, s: Settings): PublicSlot {
  return {
    id: Number(row.id),
    date: row.date,
    period: row.period,
    capacity: row.capacity,
    booked: row.booked,
    closed: row.is_closed,
    ...slotTimes(row.period, row, s),
  };
}

/**
 * 기간 안의 슬롯과 예약 인원 수.
 * includeEmpty=false(게스트)면 정원 0인 슬롯은 빼요.
 */
export async function listSlots(from: string, to: string, includeEmpty: boolean): Promise<PublicSlot[]> {
  const sql = db();
  const [rows, settings] = await Promise.all([
    sql<SlotRow[]>`
      select s.id, s.date, s.period, s.capacity, s.is_closed, s.start_time, s.end_time,
             count(r.id)::int as booked
      from slots s
      left join reservations r on r.slot_id = s.id
      where s.date between ${from} and ${to}
      group by s.id
      having ${includeEmpty} or s.capacity > 0
      order by s.date, s.period desc
    `,
    getSettings(),
  ]);
  return rows.map((r) => toSlot(r, settings));
}

export type SlotUpdate = {
  date: string;
  period: Period;
  capacity?: number;
  startTime?: string | null;
  endTime?: string | null;
};

export type CapacityConflict = { date: string; period: Period; booked: number; capacity: number };

/** 여러 슬롯 정원/시간을 한 번에 설정. force가 아니면 예약 인원보다 낮추는 경우를 돌려줘요. */
export async function upsertSlots(
  updates: SlotUpdate[],
  force: boolean,
): Promise<{ conflicts: CapacityConflict[]; saved: number }> {
  return db().begin(async (sql) => {
    const conflicts: CapacityConflict[] = [];
    for (const u of updates) {
      if (u.capacity === undefined) continue;
      const [row] = await sql<{ booked: number }[]>`
        select count(r.id)::int as booked
        from slots s join reservations r on r.slot_id = s.id
        where s.date = ${u.date} and s.period = ${u.period}
      `;
      if (row && row.booked > u.capacity) {
        conflicts.push({ date: u.date, period: u.period, booked: row.booked, capacity: u.capacity });
      }
    }
    if (conflicts.length && !force) return { conflicts, saved: 0 };

    for (const u of updates) {
      const hasTime = u.startTime !== undefined || u.endTime !== undefined;
      await sql`
        insert into slots (date, period, capacity, start_time, end_time)
        values (${u.date}, ${u.period}, ${u.capacity ?? 0}, ${u.startTime || null}, ${u.endTime || null})
        on conflict (date, period) do update set
          capacity = case when ${u.capacity !== undefined} then excluded.capacity else slots.capacity end,
          start_time = case when ${hasTime} then excluded.start_time else slots.start_time end,
          end_time = case when ${hasTime} then excluded.end_time else slots.end_time end
      `;
    }
    return { conflicts, saved: updates.length };
  });
}

export async function setSlotClosed(id: number, closed: boolean): Promise<boolean> {
  const rows = await db()`update slots set is_closed = ${closed} where id = ${id} returning id`;
  return rows.length > 0;
}

/**
 * 기본 패턴(금 저녁, 토 점심·저녁, 일 점심·저녁)으로 startDate부터 weeks주 동안 슬롯을 열어요.
 * 이미 있는 슬롯은 건드리지 않아요.
 */
export async function openDefaultPattern(startDate: string, weeks: number, capacity: number): Promise<number> {
  const sql = db();
  let created = 0;
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(startDate, i);
    for (const p of DEFAULT_PATTERN.filter((p) => p.weekday === weekday(date))) {
      const rows = await sql`
        insert into slots (date, period, capacity) values (${date}, ${p.period}, ${capacity})
        on conflict (date, period) do nothing returning id
      `;
      created += rows.length;
    }
  }
  return created;
}
