import postgres from "postgres";

declare global {
  // 개발 서버가 다시 불러올 때 연결이 쌓이지 않게 재사용
  var __sql: postgres.Sql | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 환경변수가 없어요.");
  return postgres(url, {
    // Supabase 연결 풀러(트랜잭션 모드)는 prepared statement를 지원하지 않아요
    prepare: false,
    max: 5,
    idle_timeout: 20,
    types: {
      // date 컬럼을 Date 객체 대신 'YYYY-MM-DD' 문자열로 받기
      date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
    },
  });
}

export function db(): postgres.Sql {
  return (globalThis.__sql ??= createClient());
}
