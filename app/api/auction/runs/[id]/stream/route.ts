import { NextRequest } from "next/server";
import { db } from "@/lib/db";

const TICK_DELAY_MS = 80;

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const results = await db.auctionResult.findMany({
    where: { runId: id },
    orderBy: { iterationIndex: "asc" },
    include: {
      slot: { select: { id: true, name: true, reservePriceCents: true } },
      rankedBids: {
        orderBy: { rank: "asc" },
        include: { advertiser: { select: { id: true, name: true, behaviorMode: true } } }
      }
    }
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify({ runId: id, total: results.length })}\n\n`));
      for (const r of results) {
        controller.enqueue(
          encoder.encode(
            `event: auction\ndata: ${JSON.stringify({
              iterationIndex: r.iterationIndex,
              slot: r.slot,
              filled: r.filled,
              winnerAdvertiserId: r.winnerAdvertiserId,
              clearingPriceCents: r.clearingPriceCents,
              reservePriceCents: r.reservePriceCents,
              rankedBids: r.rankedBids.map((row) => ({
                advertiserId: row.advertiserId,
                advertiserName: row.advertiser.name,
                behaviorMode: row.advertiser.behaviorMode,
                bidCents: row.bidCents,
                effectiveBidCents: row.effectiveBidCents,
                qualityScore: row.qualityScore,
                adjustedScore: row.adjustedScore,
                eligible: row.eligible,
                ineligibilityReason: row.ineligibilityReason,
                rank: row.rank
              }))
            })}\n\n`
          )
        );
        await new Promise((resolve) => setTimeout(resolve, TICK_DELAY_MS));
      }
      controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ runId: id })}\n\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
