# 🏠 집들이 예약 사이트

친구들이 날짜와 점심/저녁 시간대를 골라 집들이를 예약하는 사이트예요.

- **게스트 페이지** `/` : 월간 캘린더, 예약하기, 오시는 길, 유의사항
- **내 예약** `/my` : 이름과 연락처로 내 예약 찾기, 수정 요청 남기기
- **관리자 페이지** `/admin` : 비밀번호로 로그인. 슬롯 정원 설정, 예약 확인/수정/취소, 수정 요청 확인, CSV 내려받기, 문구 설정

게스트에게는 슬롯별 **인원 수만** 보내요. 이름, 연락처, 메뉴, 메모는 관리자 API에서만 나와요.
마지막 한 자리를 여러 명이 동시에 예약하면 DB에서 슬롯을 잠그고 다시 세기 때문에 정원만큼만 성공해요.

## 기술 스택

- Next.js 15 (App Router) + Tailwind CSS 4
- PostgreSQL (무료 Supabase 추천), `postgres` 라이브러리로 서버에서만 접속
- 배포: Vercel 무료 플랜

## 배포하기 (무료, 약 15분)

### 1. Supabase에서 DB 만들기

1. [supabase.com](https://supabase.com)에 가입하고 **New project**를 만들어요. 지역은 `Northeast Asia (Seoul)`을 고르면 빨라요. DB 비밀번호는 따로 적어 두세요.
2. 왼쪽 메뉴 **SQL Editor**에 [`db/schema.sql`](db/schema.sql) 내용을 붙여 넣고 **Run**을 눌러요.
3. 상단 **Connect** 버튼 → **Transaction pooler**의 연결 주소(URI)를 복사해요. `postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres` 같은 모양이에요. `[YOUR-PASSWORD]` 자리에 1번의 DB 비밀번호를 넣어요.

### 2. Vercel에 배포하기

1. [vercel.com](https://vercel.com)에 GitHub 계정으로 가입하고 **Add New → Project**에서 이 저장소를 고르세요.
2. **Environment Variables**에 세 가지를 넣어요.

   | 이름 | 값 |
   |---|---|
   | `DATABASE_URL` | 위에서 복사한 Supabase 연결 주소 |
   | `ADMIN_PASSWORD` | 관리자 페이지 비밀번호 (친구들이 모르는 걸로) |
   | `SESSION_SECRET` | 아무 긴 문자열 (예: 키보드로 막 친 30자) |

3. **Deploy**를 누르면 `https://프로젝트이름.vercel.app` 주소가 생겨요.

### 3. 일정 열고 공유하기

1. `https://프로젝트이름.vercel.app/admin`에 들어가 비밀번호로 로그인해요.
2. **슬롯 설정 → 기본 일정 한 번에 열기**를 누르면 매주 금요일 저녁, 토요일 점심·저녁, 일요일 점심·저녁이 정원 4명으로 열려요.
3. **설정** 탭에서 주소, 오시는 길, 주차 안내 문구를 확인하고 고쳐요.
4. 게스트 주소(`https://프로젝트이름.vercel.app`)를 카톡으로 공유해요. `/admin` 주소는 공유하지 마세요.

## 내 컴퓨터에서 실행하기

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, ADMIN_PASSWORD 채우기
npm run db:setup             # 테이블 만들기 + 기본 일정(오늘부터 4주) 열기
npm run dev                  # http://localhost:3000
```

완성 기준을 API로 확인하는 테스트도 있어요. **테스트용 DB에서만** 실행하세요 (다음 주 토요일 슬롯을 바꿔요).

```bash
BASE_URL=http://localhost:3000 ADMIN_PASSWORD=... node scripts/smoke-test.mjs
```
