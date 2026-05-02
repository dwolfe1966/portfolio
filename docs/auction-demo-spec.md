# Auction Desk — Demo App Spec

Working spec for demo app #3: an interactive Vickrey-style auction simulator for a closed advertising ecosystem. Mirrors the case study at `/projects/vickrey-auction-closed-ads-ecosystem`.

This is the source of truth for build scope. Edit when scope changes. Tier is **C** (full closed ecosystem: marketplace simulator + live auction-stream view + reserve auto-tuning + bidder behavior modes + marketplace health dashboard) per the conversation thread that produced this spec.

## Identity

- **Name**: Auction Desk
- **Route prefix**: `/auction/*`
- **DemoSideNav app key**: `auction`
- **Position in nav**: third app, alongside `lifecycle` and `acquisition`. Lives in the `(demo)` route group, wrapped by `DemoAppShell app="auction"`.
- **Tag line**: "Quality-adjusted second-price auctions for a closed ad marketplace."

## Goals

1. A visitor lands in `/auction/overview` and sees the case-study pipeline (intake → score → clear → guardrails) expressed as a runnable system, not a diagram.
2. The auction engine is **pure**, deterministic given inputs, and unit-testable independent of any UI or DB.
3. Reserves and pacing are first-class operator controls, not flags hidden in inputs.
4. Outputs surface the three case-study KPIs explicitly: bidder trust proxy, fill quality, revenue stability.
5. Visual + structural language matches the existing demo design system (sidebar nav, breadcrumbs, status indicators, monospace KPIs, band colors).

## Non-goals

- A real RTB integration. Bids are submitted via the demo UI / seeded test data; no third-party connection.
- Multi-tenant publishers. One marketplace, one publisher operator.
- Persistent advertiser identity / authentication. Advertisers are demo records, not user accounts.

## Information architecture

Four primary pages, mirroring lifecycle/acquisition:

| Route | Purpose |
|---|---|
| `/auction/overview` | Architecture explainer + readiness counts (advertisers, slots, recent runs, audit logs) |
| `/auction/inputs` | Define inventory slots, advertiser pool with behavior modes, default reserves, default quality-score distribution |
| `/auction/simulations` | Run N auctions against current inputs; **live auction-stream ticker** + latest run summary |
| `/auction/outputs` | Trend over recent runs: revenue stability, fill quality, advertiser economics, allocation distribution |
| `/auction/health` | Marketplace health dashboard — fill rate over time, revenue stability over time, advertiser concentration (HHI), bidder churn proxy, **reserve auto-tuning suggestions** per slot |

Plus an **Operations** subsection in the side nav:
- `/auction/audit` — auction-level audit log (per-auction event with inputs, allocation, clearing math)

The campaign-detail equivalent for Auction Desk is a **run-detail** page at `/auction/runs/[id]` showing every auction in that run with full clearing math (bid table, ranking, winner, second-price calc, reserve check, pacing impact).

## Auction engine

### Inputs to a single auction

```ts
type BehaviorMode = "truthful" | "shaded" | "auto_bid";

type AuctionInputs = {
  slotId: string;
  reservePriceCents: number;
  bids: Array<{
    advertiserId: string;
    bidCents: number;        // submitted bid (will be transformed by behavior mode below)
    qualityScore: number;    // 0-1; relevance/expected CTR/eligibility
    eligible: boolean;       // budget + pacing + targeting check
    behaviorMode: BehaviorMode;
    targetCacCents?: number; // required when behaviorMode === "auto_bid"
  }>;
};
```

### Behavior modes

Before ranking, the engine transforms each bid based on the advertiser's behavior mode:

- **`truthful`**: bid used verbatim. Optimal under Vickrey theory; this is the baseline.
- **`shaded`**: `effectiveBid = bidCents * 0.85`. Demonstrates suboptimal bidding — shaders win less and pay slightly less when they do.
- **`auto_bid`**: `effectiveBid = min(bidCents, targetCacCents / qualityScore)`. Caps the bid such that expected CAC stays at the advertiser's target given their quality score. Common pattern in real ad platforms.

The case-study story is "Vickrey rewards truthful bidding"; behavior modes let visitors see this empirically by comparing wins/economics across modes.

### Clearing rule (quality-adjusted second-price)

Given the case-study language ("quality-adjusted scoring" + "second-price clearing"), the engine implements the **GSP-with-quality** rule that is the standard form of quality-weighted Vickrey for ad auctions:

1. Filter out ineligible bids (budget exhausted, pacing throttle, targeting mismatch).
2. Compute each remaining bid's **adjusted score**: `adjustedScore = bidCents × qualityScore`.
3. Drop bids whose `bidCents` is below `reservePriceCents`.
4. Rank by adjusted score descending. Highest wins.
5. Winner's **clearing price** = `ceil(secondAdjustedScore / winnerQualityScore) + 1`, clamped to be at least the reserve. If no second bid exists, clearing price = reserve.
6. If no eligible bids remain, the slot goes unfilled (no allocation, no revenue).

This rewards quality (a high-quality bidder can win against a higher cash bid from a lower-quality competitor) and preserves the truthful-bidding incentive at the cash level for any fixed quality score.

### Pacing

Each advertiser carries a `dailyBudgetCents` and a `smoothingFactor` (0..1). Pacing is enforced before the eligibility check:

```
maxAllowableBid = dailyBudgetCents × smoothingFactor / expectedRemainingAuctionsToday
if bidCents > maxAllowableBid → pacing throttle → eligible = false
```

Smoothing of `1.0` = no smoothing (advertiser can spend the entire daily budget on a single high-CPC win). Smoothing of `0.1` = aggressive smoothing (cap each individual bid at 10% of daily budget pacing target).

When an advertiser wins and pays `clearingPrice`, their `spentCents` for the day increases by that amount. If `spentCents >= dailyBudgetCents`, all subsequent bids from that advertiser become ineligible until the next day.

### Outputs from a single auction

```ts
type AuctionResult = {
  slotId: string;
  filled: boolean;
  winnerAdvertiserId: string | null;
  clearingPriceCents: number | null;
  rankedBids: Array<{
    advertiserId: string;
    bidCents: number;
    qualityScore: number;
    adjustedScore: number;
    eligible: boolean;
    ineligibilityReason?: "budget_exhausted" | "pacing_throttle" | "below_reserve";
  }>;
};
```

### Run-level KPIs

A "run" is N auctions executed against a fixed input snapshot. KPIs computed at run completion:

- **Revenue total**: sum of clearingPriceCents across filled auctions.
- **Fill rate**: filled / total auctions.
- **Fill quality**: average winnerQualityScore across filled auctions.
- **Revenue stability**: 1 - coefficient-of-variation of revenue per auction across the run (higher is more stable).
- **Bidder trust proxy**: median ratio of `clearingPriceCents / winnerBidCents`. Lower means winners are paying meaningfully less than they bid (the case-study trust signal — advertisers are not being max-charged).
- **Per-advertiser**: total wins, total spend, average clearing price paid, fill share.

## Schema

New Prisma models. All under the same `db` client.

```prisma
model AuctionAdvertiser {
  id                  String   @id @default(cuid())
  name                String
  qualityScore        Float
  dailyBudgetCents    Int
  smoothingFactor     Float    @default(0.5)
  behaviorMode        String   @default("truthful")  // "truthful" | "shaded" | "auto_bid"
  targetCacCents      Int?
  createdAt           DateTime @default(now())
  bids                AuctionBid[]
  spends              AuctionAdvertiserSpend[]
  results             AuctionResultRow[]
}

model AuctionSlot {
  id                  String   @id @default(cuid())
  name                String
  reservePriceCents   Int
  expectedDailyVolume Int      @default(100)
  createdAt           DateTime @default(now())
  bids                AuctionBid[]
  results             AuctionResult[]
}

model AuctionBid {
  id            String   @id @default(cuid())
  advertiserId  String
  slotId        String
  bidCents      Int
  createdAt     DateTime @default(now())
  advertiser    AuctionAdvertiser @relation(fields: [advertiserId], references: [id])
  slot          AuctionSlot @relation(fields: [slotId], references: [id])

  @@unique([advertiserId, slotId])
}

model AuctionRun {
  id                       String   @id @default(cuid())
  totalAuctions            Int
  totalRevenueCents        Int
  fillRate                 Float
  fillQuality              Float
  revenueStability         Float
  bidderTrustProxy         Float
  createdAt                DateTime @default(now())
  results                  AuctionResult[]
  spendSnapshots           AuctionAdvertiserSpend[]
}

model AuctionResult {
  id                   String   @id @default(cuid())
  runId                String
  slotId               String
  filled               Boolean
  winnerAdvertiserId   String?
  clearingPriceCents   Int?
  reservePriceCents    Int
  iterationIndex       Int
  createdAt            DateTime @default(now())
  run                  AuctionRun @relation(fields: [runId], references: [id])
  slot                 AuctionSlot @relation(fields: [slotId], references: [id])
  rankedBids           AuctionResultRow[]

  @@index([runId, iterationIndex])
}

model AuctionResultRow {
  id                   String   @id @default(cuid())
  resultId             String
  advertiserId         String
  bidCents             Int
  qualityScore         Float
  adjustedScore        Float
  eligible             Boolean
  ineligibilityReason  String?
  rank                 Int
  result               AuctionResult @relation(fields: [resultId], references: [id])
  advertiser           AuctionAdvertiser @relation(fields: [advertiserId], references: [id])

  @@index([resultId, rank])
}

model AuctionAdvertiserSpend {
  id            String   @id @default(cuid())
  runId         String
  advertiserId  String
  totalSpendCents Int
  totalWins     Int
  averageClearingCents Int
  fillShare     Float
  run           AuctionRun @relation(fields: [runId], references: [id])
  advertiser    AuctionAdvertiser @relation(fields: [advertiserId], references: [id])

  @@unique([runId, advertiserId])
}

model AuctionAuditLog {
  id          String   @id @default(cuid())
  runId       String?
  actor       String
  action      String
  metadata    Json
  createdAt   DateTime @default(now())

  @@index([runId, createdAt])
  @@index([action, createdAt])
}
```

## API surface

| Route | Method | Purpose |
|---|---|---|
| `/api/auction/advertisers` | GET, POST | List/create advertisers (validated input) |
| `/api/auction/advertisers/[id]` | PATCH, DELETE | Edit/remove |
| `/api/auction/slots` | GET, POST | List/create slots |
| `/api/auction/slots/[id]` | PATCH, DELETE | Edit/remove |
| `/api/auction/bids` | GET, POST | Submit bids (advertiser × slot pair) |
| `/api/auction/runs` | POST | Run N auctions against current inputs; returns run summary + result IDs |
| `/api/auction/runs` | GET | List recent runs |
| `/api/auction/runs/[id]` | GET | Run detail with per-auction breakdown |
| `/api/auction/runs/[id]/stream` | GET (SSE) | Server-sent events emitting per-auction results as they fire (live ticker) |
| `/api/auction/health` | GET | Marketplace health summary: fill-rate trend, revenue-stability trend, HHI, bidder-churn proxy, per-slot reserve recommendations |

All POST/PATCH/DELETE gated by `isDemoMutationAllowed()` and structured error contract.

## Component plan

**Pure logic** — `lib/auction-engine.ts`:
- `applyBehaviorMode(bid, mode, targetCac, qualityScore): number` — transforms bid before ranking
- `runAuction(inputs: AuctionInputs): AuctionResult`
- `runAuctionRound(slots, advertisers, options): RunOutput` (computes a full N-auction run)
- `computeRunKpis(results): RunKpis`
- `suggestReserve(historicalResults, slotId): { suggestedReserveCents, expectedRevenueLift, sampleSize }` — looks at the empirical distribution of clearing prices and recommends a reserve at the 25th percentile (conservative) with an estimated revenue impact
- `computeMarketplaceHealth(recentRuns): HealthSummary` — fill-rate trend, revenue-stability trend, HHI (Σ marketShare², where marketShare = advertiserSpend / totalSpend), bidder-churn proxy (advertisers with >0 wins in run N-1 but 0 wins in run N)

**Server pages** — under `app/(demo)/auction/`:
- `overview/page.tsx`, `inputs/page.tsx`, `simulations/page.tsx`, `outputs/page.tsx`, `audit/page.tsx`, `health/page.tsx`, `runs/[id]/page.tsx`, `page.tsx` (redirect to overview)
- `layout.tsx` wraps in `DemoAppShell app="auction"`

**Client components** — under `components/auction/`:
- `AuctionAdvertiserEditor` (CRUD list + form, includes behavior-mode picker + targetCac input shown conditionally)
- `AuctionSlotEditor` (CRUD list + form)
- `AuctionBidEditor` (matrix-style: advertisers × slots; cell value = bid)
- `RunAuctionsButton` (form: number of auctions + submit; offers "Run with live ticker" toggle)
- `AuctionLiveTicker` (subscribes to SSE stream; renders most recent ~20 auctions with monospace clearing math; falls back gracefully if EventSource unsupported)
- `AuctionRunSummaryCard` (run KPIs in monospace chips)
- `AuctionResultDetail` (per-auction breakdown with ranked bids and clearing math)
- `MarketplaceHealthCharts` (sparkline trends for fill-rate / stability / HHI; reserve-tuning recommendations rendered as cards per slot)
- `AcceptReserveSuggestionButton` (one-click apply of `suggestReserve` output to a slot)

**Reused primitives**: `MetricChip`, `StatusDot`, `Breadcrumbs`, `Section`, `DemoAppShell` — already shipped in the F-series.

## DemoSideNav extension

Add a third app to `components/demo-shell/DemoSideNav.tsx`:

```ts
type DemoApp = "lifecycle" | "acquisition" | "auction";

const AUCTION_LINKS: NavLink[] = [
  { href: "/auction/overview", label: "Overview", group: "primary" },
  { href: "/auction/inputs", label: "Inputs", group: "primary" },
  { href: "/auction/simulations", label: "Simulations", group: "primary" },
  { href: "/auction/outputs", label: "Outputs", group: "primary" },
  { href: "/auction/health", label: "Health", group: "primary" },
  { href: "/auction/audit", label: "Audit", group: "operations" }
];
```

Update `DemoAppHeader` `APP_LABEL` and `DemoAppBreadcrumbs` `APP_LABEL` to include `auction: "Auction Desk"`.

Add a third color tint in `globals.css`:
```css
.demoAppShell-auction {
  background: linear-gradient(180deg, #fdf6ec 0%, #fffaf2 100%);
}
```

## Phased rollout

### Phase A — Engine + schema (foundation)
- `lib/auction-engine.ts` pure functions, including `applyBehaviorMode`, `runAuction`, `runAuctionRound`, `computeRunKpis`, `suggestReserve`, `computeMarketplaceHealth`
- Prisma schema + migration (advertisers, slots, bids, runs, results, result rows, advertiser-spend snapshots, audit log)
- Tests: 18+ cases covering ranking, ties, reserve, pacing throttle, budget exhaustion, fill rate, KPI math, all three behavior modes, reserve-suggestion percentile math, HHI, and bidder-churn detection

### Phase B — Inputs + simulation API
- Advertiser/Slot/Bid CRUD APIs + validation helpers
- `POST /api/auction/runs` orchestrating engine + persistence
- `/auction/inputs` page wired to the editors (with behavior-mode picker on advertisers)

### Phase C — Outputs, run detail, and live ticker
- `/auction/simulations` (run trigger + latest run summary + **live ticker via SSE**)
- `GET /api/auction/runs/[id]/stream` — SSE endpoint emitting per-auction results
- `/auction/outputs` (run trend, advertiser economics, KPI cards)
- `/auction/runs/[id]` (per-auction breakdown)
- `/auction/overview` (architecture + readiness counts)
- `/auction/audit` (audit feed)

### Phase D — Marketplace health + reserve auto-tuning
- `/auction/health` page rendering trend sparklines, HHI, churn proxy
- `GET /api/auction/health` returning the summary payload
- Per-slot reserve recommendations with one-click "apply suggestion" affordance
- `computeMarketplaceHealth` wiring + reserve-suggestion endpoint integration

### Phase E — Polish + integration
- Side nav + breadcrumb + shell wiring (third app added to `DemoApp` union)
- Project case study: flip status to `live`, add `appHref: "/auction/overview"`, surface `DemoAppLaunchCard` on the case-study detail
- Home page featured projects updated if desired
- Final visual pass + cross-browser SSE smoke check

Phase A ships independent of UI. Phase B–D each lean on prior phases.

## Open questions / defaults

1. **Seed data.** Demo should ship with 4–6 advertisers and 2–3 slots seeded so the demo isn't empty on first load. **Default**: extend `prisma/seed.ts` (or `lib/seed.ts`) with a `seedAuctionData()` helper.
2. **Bid randomization.** When running an auction "round" against a fixed bid matrix, should bids be perturbed (small noise) or used verbatim each iteration? **Default**: ±5% per-iteration noise on bids and quality scores so revenue stability has something to stabilize. Toggleable via run options.
3. **Run size cap.** Cap N auctions per run at 500 to avoid runaway DB writes. **Default**: 500.

## Definition of done

- All five primary pages (overview, inputs, simulations, outputs, health) + audit + run-detail render against seeded data
- Live ticker on `/auction/simulations` updates as auctions fire (SSE)
- Engine has 18+ unit tests covering happy path + every guardrail + all behavior modes + reserve-suggestion math + HHI + churn detection
- Type-check + build clean; full test suite passing
- Project case study `/projects/vickrey-auction-closed-ads-ecosystem` flipped to `live` and renders a `DemoAppLaunchCard` linking `/auction/overview`
- Side nav, breadcrumbs, header app-name all support `auction`
- Visual parity with lifecycle/acquisition: same shell, same primitives, same density tokens
- One reserve auto-tuning suggestion can be accepted with a single click and visibly updates the corresponding slot's reserve price
