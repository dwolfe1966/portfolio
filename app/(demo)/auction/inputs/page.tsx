import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { AuctionAdvertiserEditor } from "@/components/auction/AuctionAdvertiserEditor";
import { AuctionSlotEditor } from "@/components/auction/AuctionSlotEditor";
import { AuctionBidMatrix } from "@/components/auction/AuctionBidMatrix";
import { AuctionWorkspaceDatasetPanel } from "@/components/auction/AuctionWorkspaceDatasetPanel";
import { ToolDataSourceNotice } from "@/components/site/ToolDataSourceNotice";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ datasetApplied?: string; datasetError?: string }>;
};

export default async function AuctionInputsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  try {
    const [advertisers, slots, bids] = await Promise.all([
      db.auctionAdvertiser.findMany({ orderBy: { createdAt: "asc" } }),
      db.auctionSlot.findMany({ orderBy: { createdAt: "asc" } }),
      db.auctionBid.findMany()
    ]);

    return (
      <>
        <Section eyebrow="Inputs" title="Marketplace participants and bids">
          <p>
            Define the advertiser pool, the inventory slots they bid on, and a bid matrix
            of cents-per-impression values. Saved bids are fed into every auction run; quality
            scores and reserve prices come into play during clearing.
          </p>
        </Section>

        <Section title="Current app data">
          <ToolDataSourceNotice datasetApplied={params?.datasetApplied} datasetError={params?.datasetError} />
          <AuctionWorkspaceDatasetPanel compact />
        </Section>

        <Section title="Advertisers">
          <AuctionAdvertiserEditor advertisers={advertisers} />
        </Section>

        <Section title="Inventory slots">
          <AuctionSlotEditor slots={slots} />
        </Section>

        <Section title="Bid matrix">
          <AuctionBidMatrix advertisers={advertisers} slots={slots} bids={bids} />
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <Section title="Auction inputs">
          <div className="card">
            <p>Auction tables are missing. Run database migrations.</p>
          </div>
        </Section>
      );
    }
    throw error;
  }
}
