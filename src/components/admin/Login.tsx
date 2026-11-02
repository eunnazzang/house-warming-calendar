"use client";

import { useState } from "react";
import { api } from "./api";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto max-w-sm px-4 pt-24">
      <form
        className="card space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
          setBusy(false);
          if (r.ok) onSuccess();
          else setError(r.data.error ?? "로그인하지 못했어요.");
        }}
      >
        <h1 className="font-display text-center text-2xl">🔑 관리자 로그인</h1>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoFocus
        />
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </main>
  );
}
