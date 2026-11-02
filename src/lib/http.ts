import { NextResponse } from "next/server";
import { isAdmin } from "./auth";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return json({ error: message, ...extra }, status);
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** 어드민이 아니면 401 응답을 돌려주고, 맞으면 null */
export async function requireAdmin() {
  return (await isAdmin()) ? null : fail("관리자 로그인이 필요해요.", 401);
}

export function isPgError(e: unknown, code: string): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === code;
}
