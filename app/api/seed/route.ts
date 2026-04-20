import { NextResponse } from "next/server";
import { reseed } from "@/lib/seed";
export async function POST() {
  await reseed();
  return NextResponse.json({ ok: true });
}
