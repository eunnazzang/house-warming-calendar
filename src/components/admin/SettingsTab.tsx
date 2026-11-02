"use client";

import { useEffect, useState } from "react";
import type { Settings } from "@/lib/settings";
import { api } from "./api";

const TEXT_FIELDS: { key: keyof Settings; label: string; rows?: number }[] = [
  { key: "title", label: "제목" },
  { key: "greeting", label: "인사말", rows: 2 },
  { key: "notice", label: "유의사항", rows: 3 },
  { key: "address", label: "주소" },
  { key: "entrance", label: "들어오는 법", rows: 2 },
  { key: "transit", label: "대중교통 안내", rows: 4 },
  { key: "parking", label: "주차 안내", rows: 3 },
];

const TIME_FIELDS: { key: keyof Settings; label: string }[] = [
  { key: "lunchStart", label: "점심 시작" },
  { key: "lunchEnd", label: "점심 끝" },
  { key: "dinnerStart", label: "저녁 시작" },
  { key: "dinnerEnd", label: "저녁 끝" },
];

export default function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api<{ settings: Settings }>("/api/admin/settings").then((r) => r.ok && setSettings(r.data.settings));
  }, []);

  if (!settings) return <p className="text-muted">불러오는 중…</p>;
  const set = (key: keyof Settings, v: string) => setSettings({ ...settings, [key]: v });

  return (
    <form
      className="card max-w-2xl space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await api<{ settings: Settings }>("/api/admin/settings", {
          method: "PUT",
          body: JSON.stringify(settings),
        });
        setMessage(r.ok ? "저장했어요. 게스트 화면에 바로 반영돼요." : "저장하지 못했어요.");
      }}
    >
      <h2 className="font-display text-lg">게스트 화면 문구와 기본 시간대</h2>
      {TEXT_FIELDS.map((f) => (
        <div key={f.key}>
          <label className="label" htmlFor={`s-${f.key}`}>
            {f.label}
          </label>
          {f.rows ? (
            <textarea
              id={`s-${f.key}`}
              className="input"
              rows={f.rows}
              value={settings[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : (
            <input id={`s-${f.key}`} className="input" value={settings[f.key]} onChange={(e) => set(f.key, e.target.value)} />
          )}
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TIME_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label" htmlFor={`s-${f.key}`}>
              {f.label}
            </label>
            <input
              id={`s-${f.key}`}
              type="time"
              className="input !py-2"
              value={settings[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button className="btn-primary">저장하기</button>
      {message && <p className="text-sm font-bold text-ok">{message}</p>}
    </form>
  );
}
