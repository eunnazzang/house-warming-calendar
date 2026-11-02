import type { Metadata, Viewport } from "next";
import { Gowun_Dodum, Jua } from "next/font/google";
import "./globals.css";

const body = Gowun_Dodum({ weight: "400", subsets: ["latin"], variable: "--font-gowun" });
const display = Jua({ weight: "400", subsets: ["latin"], variable: "--font-jua" });

export const metadata: Metadata = {
  title: "집들이 예약",
  description: "우리 집 집들이에 놀러 오세요! 편한 날짜와 시간대를 골라 예약해 주세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff8ee",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${body.variable} ${display.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
