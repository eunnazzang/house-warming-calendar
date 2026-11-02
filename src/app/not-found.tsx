import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 pt-24 text-center">
      <div className="text-5xl">🙈</div>
      <h1 className="font-display mt-3 text-2xl">페이지를 찾을 수 없어요</h1>
      <Link href="/" className="btn-primary mt-6">
        예약 페이지로 가기
      </Link>
    </main>
  );
}
