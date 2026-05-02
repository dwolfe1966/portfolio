import { Section } from "@/components/site/Section";

export const dynamic = "force-dynamic";

export default function AuctionHealthPlaceholder() {
  return (
    <Section eyebrow="Health" title="Marketplace health (coming in Phase D)">
      <p>
        Phase D wires this page to <code className="small">computeMarketplaceHealth</code> and the
        reserve auto-tuning helper. You&apos;ll get fill-rate trend, revenue-stability trend, HHI
        concentration, bidder churn proxy, and per-slot reserve recommendations with one-click apply.
      </p>
    </Section>
  );
}
