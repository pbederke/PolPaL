import { NextResponse } from "next/server";
import { enforceRouteAuth } from '@/lib/server/route-auth.server';
import fs from "fs";
import path from "path";
import { z } from "zod";

const commonPasswords = new Set(
  fs
    .readFileSync(path.resolve(process.cwd(), "src/lib/shared/commonPasswords.txt"), "utf-8")
    .split("\n")
    .map((pw) => pw.trim().toLowerCase())
    .filter(Boolean)
);

const PasswordSchema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const _auth = await enforceRouteAuth('/api/validate-password', 'POST');
  if (_auth instanceof NextResponse) return _auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Password is required' }, { status: 400 });
  }

  const { password } = parsed.data;

  if (commonPasswords.has(password.toLowerCase())) {
    return NextResponse.json({ valid: false, message: 'Password is too common' });
  }

  return NextResponse.json({ valid: true });
}