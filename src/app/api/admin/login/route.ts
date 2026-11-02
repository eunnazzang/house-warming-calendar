import { ADMIN_COOKIE, checkPassword, isAdmin } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";

export async function GET() {
  return json({ admin: await isAdmin(), configured: !!process.env.ADMIN_PASSWORD });
}

export async function POST(req: Request) {
  if (!process.env.ADMIN_PASSWORD) return fail("ADMIN_PASSWORD 환경변수를 먼저 설정해 주세요.", 500);
  const { password } = await readJson<{ password?: string }>(req);
  const token = checkPassword(String(password ?? ""));
  if (!token) {
    await new Promise((r) => setTimeout(r, 800));
    return fail("비밀번호가 맞지 않아요.", 401);
  }
  const res = json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
