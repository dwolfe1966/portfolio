import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const run = await db.campaignRun.findUnique({
    where: { id },
    include: { assumptionSet: true }
  });

  if (!run) {
    return NextResponse.json(
      { ok: false, error: "Not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, run });
}
