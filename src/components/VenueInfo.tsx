"use client";

import { useState } from "react";
import type { Settings } from "@/lib/settings";

export function NoticeCard({ notice }: { notice: string }) {
  if (!notice) return null;
  return (
    <section className="rounded-3xl border border-ok/30 bg-ok-soft p-5">
      <h2 className="font-display mb-1 text-lg text-ok">🌱 꼭 읽어 주세요</h2>
      <p className="whitespace-pre-line leading-relaxed">{notice}</p>
    </section>
  );
}

export function DirectionsCard({ settings }: { settings: Settings }) {
  const [copied, setCopied] = useState(false);
  // 동·호수는 빼고 단지 이름까지만 지도에서 검색
  const mapQuery = encodeURIComponent(settings.address.replace(/\s*\d+동.*$/, ""));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(settings.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 복사가 막힌 브라우저는 그냥 넘어가요 */
    }
  };

  return (
    <section className="card space-y-4">
      <h2 className="font-display text-lg">🗺️ 오시는 길</h2>
      <div>
        <p className="font-bold">{settings.address}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost !py-1.5" onClick={copy}>
            {copied ? "복사했어요!" : "주소 복사"}
          </button>
          <a className="btn-ghost !py-1.5" href={`https://map.naver.com/p/search/${mapQuery}`} target="_blank" rel="noreferrer">
            네이버 지도
          </a>
          <a className="btn-ghost !py-1.5" href={`https://map.kakao.com/link/search/${mapQuery}`} target="_blank" rel="noreferrer">
            카카오맵
          </a>
        </div>
      </div>
      {settings.entrance && <InfoRow icon="🔔" title="들어오는 법" text={settings.entrance} />}
      {settings.transit && <InfoRow icon="🚇" title="대중교통" text={settings.transit} />}
      {settings.parking && <InfoRow icon="🚗" title="주차" text={settings.parking} />}
    </section>
  );
}

function InfoRow({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{text}</p>
      </div>
    </div>
  );
}
