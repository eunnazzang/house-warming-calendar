"use client";

import { useState } from "react";

export default function ChangeRequest({ token, requested, note }: { token: string; requested: boolean; note: string }) {
  const [checked, setChecked] = useState(requested);
  const [text, setText] = useState(note);
  const [sent, setSent] = useState(requested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/my/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: text }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("요청을 보내지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="font-display text-lg">✏️ 예약을 바꾸고 싶으세요?</h2>
      <p className="text-sm text-muted">
        예약은 직접 바꿀 수 없어요. 수정을 원한다고 체크해 두면 집주인이 보고 연락드릴게요.
      </p>
      {sent ? (
        <div className="rounded-2xl bg-warn-soft p-4 text-sm">
          <p className="font-bold text-warn">수정 요청을 보냈어요. 곧 연락드릴게요!</p>
          {text && <p className="mt-1 whitespace-pre-line text-ink">“{text}”</p>}
          <button type="button" className="mt-2 text-xs text-muted underline" onClick={() => setSent(false)}>
            요청 내용 고치기
          </button>
        </div>
      ) : (
        <>
          <label className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[#ff9b71]"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            수정을 원해요
          </label>
          {checked && (
            <>
              <textarea
                className="input min-h-20"
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
                placeholder="예: 토요일 저녁으로 바꾸고 싶어요"
              />
              {error && <p className="text-sm font-bold text-red-600">{error}</p>}
              <button type="button" className="btn-primary w-full" onClick={send} disabled={busy}>
                {busy ? "보내는 중…" : "수정 요청 보내기"}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
