import { db } from "./db";

export type Settings = {
  title: string;
  greeting: string;
  address: string;
  entrance: string;
  transit: string;
  parking: string;
  notice: string;
  lunchStart: string;
  lunchEnd: string;
  dinnerStart: string;
  dinnerEnd: string;
};

export const DEFAULT_SETTINGS: Settings = {
  title: "우리 집 집들이에 놀러 오세요",
  greeting: "새 집에서 맛있는 밥 한 끼 같이 해요. 편한 날짜와 시간대를 골라 주세요!",
  address: "서울시 성북구 정릉동 푸른마을동아아파트 106동 1505호",
  entrance: "1층 공동현관에서 1505를 누르고 호출해 주세요.",
  transit:
    "우이신설선 정릉역에서 걸어서 약 7분(약 550m)이에요. 우이신설선은 성신여대입구역(4호선), 보문역(6호선), 신설동역(1·2호선)에서 갈아탈 수 있어요. 버스는 단지 앞 정류장에 1164번, 2115번이 서요.",
  parking:
    "단지 안 주차장을 이용할 수 있어요. 차로 오시면 예약할 때 차량번호를 남겨 주세요. 미리 방문 차량으로 등록해 둘게요.",
  notice:
    "저희 집은 채식을 지향해요. 고기나 생선처럼 채식이 아닌 음식은 가져오지 말아 주세요. 빈손으로 오셔도 정말 괜찮아요!",
  lunchStart: "12:00",
  lunchEnd: "15:00",
  dinnerStart: "18:00",
  dinnerEnd: "21:00",
};

export async function getSettings(): Promise<Settings> {
  const rows = await db()<{ value: Partial<Settings> }[]>`
    select value from settings where key = 'site'
  `;
  return { ...DEFAULT_SETTINGS, ...(rows[0]?.value ?? {}) };
}

export async function saveSettings(input: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const v = input[key];
    if (typeof v === "string") next[key] = v.trim().slice(0, 2000);
  }
  await db()`
    insert into settings (key, value) values ('site', ${db().json(next)})
    on conflict (key) do update set value = excluded.value
  `;
  return next;
}
