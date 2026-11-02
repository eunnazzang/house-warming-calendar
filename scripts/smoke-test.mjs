// 완성 기준 체크리스트를 실제 API로 확인하는 스크립트.
// 테스트용 DB에서만 실행하세요. 슬롯 정원을 바꾸고 예약을 만들고 지워요.
// 사용법: BASE_URL=http://localhost:3000 ADMIN_PASSWORD=... node scripts/smoke-test.mjs
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD) throw new Error("ADMIN_PASSWORD가 필요해요.");

let cookie = "";
let failed = 0;
const ok = (cond, label) => {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failed++;
};

async function call(path, { method = "GET", body, admin = false } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(admin && cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, text };
}

// 다음 주 토요일
const now = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()) + "T00:00:00Z");
now.setUTCDate(now.getUTCDate() + ((6 - now.getUTCDay() + 7) % 7) + 7);
const SAT = now.toISOString().slice(0, 10);
const MONTH = SAT.slice(0, 7);
const guest = (i) => ({
  name: `테스트${i}`,
  phone: `010-0000-${String(1000 + i)}`,
  teams: i % 2 ? ["은나네 팀"] : ["준영이네 팀", "은나네 팀"],
  menu: ["한식", "양식", "상관없음", "한식"][i % 4],
  memo: "12시 반쯤 도착, 4시쯤 출발할게요",
});
const guestSlots = async () => (await call(`/api/slots?month=${MONTH}`)).data.slots.filter((s) => s.date === SAT);

// 게스트는 어드민 기능을 못 써요
ok((await call("/api/admin/reservations")).status === 401, "로그인 없이 어드민 API는 거부된다");
ok((await call("/api/admin/login", { method: "POST", body: { password: "wrong" } })).status === 401, "틀린 비밀번호는 거부된다");
ok((await call("/api/admin/login", { method: "POST", body: { password: PASSWORD } })).status === 200, "어드민 로그인");

// 기존 테스트 예약 정리
const before = (await call("/api/admin/reservations", { admin: true })).data.reservations;
for (const r of before.filter((r) => r.date === SAT)) {
  await call(`/api/admin/reservations/${r.id}`, { method: "DELETE", admin: true });
}

// 1. 토요일 점심 4명, 저녁 0명
await call("/api/admin/slots", {
  method: "PUT",
  admin: true,
  body: { updates: [{ date: SAT, period: "lunch", capacity: 4 }, { date: SAT, period: "dinner", capacity: 0 }] },
});
await call("/api/admin/slots/close", { method: "POST", admin: true, body: { slotId: (await guestSlots())[0]?.id, closed: false } });
let slots = await guestSlots();
ok(slots.length === 1 && slots[0].period === "lunch" && slots[0].capacity === 4, `1. ${SAT} 점심만 게스트 캘린더에 보인다`);
const lunch = slots[0];

// 2. 예약하면 인원 +1
const r1 = await call("/api/reservations", { method: "POST", body: { slotId: lunch.id, ...guest(1) } });
ok(r1.status === 201 && r1.data.token, "2. 게스트 예약 성공");
slots = await guestSlots();
ok(slots[0].booked === 1, "2. 인원 수가 1 올라간다");

// 3. 게스트 데이터에는 이름/연락처/메뉴/메모가 없다
const raw = (await call(`/api/slots?month=${MONTH}`)).text;
ok(!/테스트|0000|한식|도착/.test(raw), "3. 게스트 응답에 이름·연락처·메뉴·메모가 없다");
const home = (await call("/")).text;
ok(!home.includes("테스트1"), "3. 게스트 페이지 HTML에도 이름이 없다");

// 중복 예약 방지
const dup = await call("/api/reservations", { method: "POST", body: { slotId: lunch.id, ...guest(1) } });
ok(dup.status === 409 && dup.data.code === "duplicate", "같은 이름+연락처 중복 예약은 막힌다");

// 입력 검증
const bad = await call("/api/reservations", { method: "POST", body: { slotId: lunch.id, ...guest(9), phone: "12345" } });
ok(bad.status === 400, "전화번호 형식이 틀리면 거부된다");
const noTeam = await call("/api/reservations", { method: "POST", body: { slotId: lunch.id, ...guest(9), teams: [] } });
ok(noTeam.status === 400, "팀을 안 고르면 거부된다");

// 정원 0인 저녁은 예약 불가
const dinnerId = (await call(`/api/admin/slots?from=${SAT}&to=${SAT}`, { admin: true })).data.slots.find((s) => s.period === "dinner").id;
ok((await call("/api/reservations", { method: "POST", body: { slotId: dinnerId, ...guest(8) } })).status === 409, "정원 0인 슬롯은 예약할 수 없다");

// 4. 동시에 남은 자리를 노리면 정원만큼만 성공
const results = await Promise.all(
  [2, 3, 4, 5, 6, 7].map((i) => call("/api/reservations", { method: "POST", body: { slotId: lunch.id, ...guest(i) } })),
);
const success = results.filter((r) => r.status === 201).length;
const full = results.filter((r) => r.data.code === "full");
ok(success === 3, `4. 6명이 동시에 남은 3자리를 예약하면 3명만 성공 (성공 ${success})`);
ok(full.length === 3 && full[0].data.error.includes("방금 마감"), "4. 나머지는 '방금 마감되었어요' 안내");
slots = await guestSlots();
ok(slots[0].booked === 4, "4. 정원 4/4로 마감");

// 5. 어드민에서 상세 정보 확인
let all = (await call("/api/admin/reservations", { admin: true })).data.reservations.filter((r) => r.date === SAT);
const first = all.find((r) => r.name === "테스트1");
ok(first && first.phone === "01000001001" && first.menu === "양식" && first.memo.includes("도착"), "5. 어드민에서 이름·연락처·메뉴·메모를 본다");
ok(all.every((r) => r.teams.length > 0), "5. 팀 정보가 저장된다");

// 정원을 예약 인원보다 낮추면 경고
const lower = await call("/api/admin/slots", { method: "PUT", admin: true, body: { updates: [{ date: SAT, period: "lunch", capacity: 2 }] } });
ok(lower.status === 409 && lower.data.conflicts?.[0]?.booked === 4, "정원을 예약 인원보다 낮추면 경고한다");

// 수정 요청
const req = await call(`/api/my/${r1.data.token}`, { method: "POST", body: { note: "저녁으로 바꾸고 싶어요" } });
ok(req.status === 200, "게스트가 수정 요청을 남긴다");
all = (await call("/api/admin/reservations", { admin: true })).data.reservations;
ok(all.find((r) => r.name === "테스트1")?.changeRequested, "어드민에 수정 요청이 표시된다");
const my = await call(`/api/my/${r1.data.token}`);
ok(my.data.reservation?.name === "테스트1" && !("id" in my.data.reservation), "내 예약 링크로 본인 예약만 본다");
ok((await call("/api/my/not-a-real-token")).status === 404, "틀린 링크는 아무것도 못 본다");

// 어드민 수정
const edit = await call(`/api/admin/reservations/${first.id}`, {
  method: "PATCH",
  admin: true,
  body: { slotId: lunch.id, ...guest(1), name: "테스트1수정", menu: "중식" },
});
ok(edit.status === 200, "어드민이 예약을 수정한다");
await call(`/api/admin/reservations/${first.id}`, { method: "PATCH", admin: true, body: { action: "resolve" } });

// 6. 취소하면 자리가 다시 열린다
await call(`/api/admin/reservations/${first.id}`, { method: "DELETE", admin: true });
slots = await guestSlots();
ok(slots[0].booked === 3, "6. 어드민이 취소하면 자리가 다시 열린다 (3/4)");

// 수동 마감
await call("/api/admin/slots/close", { method: "POST", admin: true, body: { slotId: lunch.id, closed: true } });
slots = await guestSlots();
const closedTry = await call("/api/reservations", { method: "POST", body: { slotId: lunch.id, ...guest(10) } });
ok(slots[0].closed && closedTry.status === 409, "수동 마감하면 자리가 남아도 예약할 수 없다");
await call("/api/admin/slots/close", { method: "POST", admin: true, body: { slotId: lunch.id, closed: false } });

// CSV
const csv = await call("/api/admin/reservations/export", { admin: true });
ok(typeof csv.data === "string" && csv.data.includes("선호 메뉴"), "CSV를 내려받는다");

// 정리
all = (await call("/api/admin/reservations", { admin: true })).data.reservations.filter((r) => r.name.startsWith("테스트"));
for (const r of all) await call(`/api/admin/reservations/${r.id}`, { method: "DELETE", admin: true });
await call("/api/admin/slots", { method: "PUT", admin: true, body: { updates: [{ date: SAT, period: "dinner", capacity: 4 }] } });

console.log(failed ? `\n✗ ${failed}개 실패` : "\n✓ 모두 통과");
process.exit(failed ? 1 : 0);
