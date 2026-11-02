// DB 테이블을 만들고, 슬롯이 하나도 없으면 기본 일정(오늘부터 4주)을 열어요.
// 사용법: DATABASE_URL=... npm run db:setup   (또는 .env.local에 DATABASE_URL을 적어 두기)
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";

if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL이 없어요. .env.local에 적거나 환경변수로 넘겨 주세요.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });

// src/lib/constants.ts 의 DEFAULT_PATTERN 과 같아요 (0=일, 5=금, 6=토)
const PATTERN = [
  [5, "dinner"],
  [6, "lunch"],
  [6, "dinner"],
  [0, "lunch"],
  [0, "dinner"],
];
const WEEKS = 4;
const CAPACITY = 4;

try {
  await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("✓ 테이블 준비 완료");

  const [{ count }] = await sql`select count(*)::int as count from slots`;
  if (count === 0) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    const start = new Date(`${today}T00:00:00Z`);
    let created = 0;
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const date = d.toISOString().slice(0, 10);
      for (const [weekday, period] of PATTERN) {
        if (d.getUTCDay() !== weekday) continue;
        await sql`insert into slots (date, period, capacity) values (${date}, ${period}, ${CAPACITY})
                  on conflict do nothing`;
        created++;
      }
    }
    console.log(`✓ 기본 일정 슬롯 ${created}개를 열었어요 (오늘부터 ${WEEKS}주, 정원 ${CAPACITY}명)`);
  } else {
    console.log(`· 슬롯이 이미 ${count}개 있어서 기본 일정은 건너뛰어요`);
  }
} finally {
  await sql.end();
}
