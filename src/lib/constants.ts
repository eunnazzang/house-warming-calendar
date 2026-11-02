export const MENUS = ["양식", "한식", "중식", "퓨전", "상관없음"] as const;
export type Menu = (typeof MENUS)[number];

export const TEAMS = ["준영이네 팀", "은나네 팀"] as const;
export type Team = (typeof TEAMS)[number];

export const PERIODS = ["lunch", "dinner"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  lunch: "점심",
  dinner: "저녁",
};

// 기본으로 여는 요일과 시간대 (0=일, 5=금, 6=토)
export const DEFAULT_PATTERN: { weekday: number; period: Period }[] = [
  { weekday: 5, period: "dinner" },
  { weekday: 6, period: "lunch" },
  { weekday: 6, period: "dinner" },
  { weekday: 0, period: "lunch" },
  { weekday: 0, period: "dinner" },
];
export const DEFAULT_CAPACITY = 4;
export const DEFAULT_WEEKS = 4;
