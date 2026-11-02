"use client";

import { MENUS, TEAMS, type Menu, type Team } from "@/lib/constants";

export type ReservationForm = {
  name: string;
  phone: string;
  teams: Team[];
  menu: Menu | "";
  memo: string;
  carNumber: string;
};

export const EMPTY_FORM: ReservationForm = { name: "", phone: "", teams: [], menu: "", memo: "", carNumber: "" };

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-sm font-bold transition ${
        active ? "border-peach bg-peach text-white" : "border-line bg-white text-ink hover:bg-cream"
      }`}
    >
      {children}
    </button>
  );
}

export default function ReservationFields({
  value,
  onChange,
}: {
  value: ReservationForm;
  onChange: (v: ReservationForm) => void;
}) {
  const set = <K extends keyof ReservationForm>(key: K, v: ReservationForm[K]) => onChange({ ...value, [key]: v });
  const toggleTeam = (t: Team) =>
    set("teams", value.teams.includes(t) ? value.teams.filter((x) => x !== t) : [...value.teams, t]);

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="f-name">
          이름 <span className="text-peach">*</span>
        </label>
        <input
          id="f-name"
          className="input"
          value={value.name}
          maxLength={30}
          autoComplete="name"
          onChange={(e) => set("name", e.target.value)}
          placeholder="홍길동"
        />
      </div>
      <div>
        <label className="label" htmlFor="f-phone">
          연락처 <span className="text-peach">*</span>
        </label>
        <input
          id="f-phone"
          className="input"
          value={value.phone}
          inputMode="tel"
          autoComplete="tel"
          onChange={(e) => set("phone", e.target.value)}
          placeholder="010-1234-5678"
        />
      </div>
      <fieldset>
        <legend className="label">
          어느 팀이세요? <span className="text-peach">*</span>
          <span className="ml-1 font-normal text-muted">(둘 다 골라도 돼요)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {TEAMS.map((t) => (
            <Choice key={t} active={value.teams.includes(t)} onClick={() => toggleTeam(t)}>
              {value.teams.includes(t) ? "✓ " : ""}
              {t}
            </Choice>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">
          선호 메뉴 <span className="text-peach">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {MENUS.map((m) => (
            <Choice key={m} active={value.menu === m} onClick={() => set("menu", m)}>
              {m}
            </Choice>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="f-memo">
          메모 <span className="font-normal text-muted">(선택)</span>
        </label>
        <textarea
          id="f-memo"
          className="input min-h-20"
          value={value.memo}
          maxLength={500}
          onChange={(e) => set("memo", e.target.value)}
          placeholder="예: 12시 반쯤 도착, 4시쯤 출발할게요"
        />
      </div>
      <div>
        <label className="label" htmlFor="f-car">
          차량번호 <span className="font-normal text-muted">(차로 오시면)</span>
        </label>
        <input
          id="f-car"
          className="input"
          value={value.carNumber}
          maxLength={20}
          onChange={(e) => set("carNumber", e.target.value)}
          placeholder="12가 3456"
        />
      </div>
    </div>
  );
}

/** 제출 전에 브라우저에서 먼저 확인. 서버에서도 똑같이 다시 확인해요. */
export function formError(v: ReservationForm): string | null {
  if (!v.name.trim()) return "이름을 입력해 주세요.";
  if (!/^01[016789]\d{7,8}$/.test(v.phone.replace(/\D/g, ""))) return "연락처를 010-1234-5678 형식으로 입력해 주세요.";
  if (!v.teams.length) return "어느 팀인지 하나 이상 골라 주세요.";
  if (!v.menu) return "선호 메뉴를 하나 골라 주세요.";
  return null;
}
