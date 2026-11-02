-- 집들이 예약 사이트 DB 스키마
-- Supabase SQL Editor에 그대로 붙여 넣어 실행하거나 `npm run db:setup`으로 실행하세요.

create table if not exists slots (
  id bigserial primary key,
  date date not null,
  period text not null check (period in ('lunch', 'dinner')),
  capacity int not null default 0 check (capacity >= 0),
  is_closed boolean not null default false,
  -- 비워 두면 설정의 기본 시간대를 사용
  start_time text,
  end_time text,
  unique (date, period)
);

create table if not exists reservations (
  id bigserial primary key,
  slot_id bigint not null references slots (id),
  name text not null,
  phone text not null,
  teams text[] not null,
  menu text not null check (menu in ('양식', '한식', '중식', '퓨전', '상관없음')),
  memo text not null default '',
  car_number text not null default '',
  change_requested boolean not null default false,
  change_note text not null default '',
  change_requested_at timestamptz,
  access_token text not null unique,
  created_at timestamptz not null default now(),
  unique (slot_id, name, phone)
);

create index if not exists reservations_slot_id_idx on reservations (slot_id);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);

-- Supabase의 공개 API(anon 키)로는 아무것도 읽거나 쓸 수 없게 막아 둡니다.
-- 이 앱은 서버에서만 DB 소유자 계정으로 접속하므로 영향이 없습니다.
alter table slots enable row level security;
alter table reservations enable row level security;
alter table settings enable row level security;
