# Demo App Design System

Working spec for the F-series backlog (F1, F2, F3). Direction is **Mission Control with monospace KPIs** — the demo apps express an operator-in-the-loop autonomous-agent narrative, with status color carrying meaning and live activity visible at all times.

This spec is the source of truth we execute against. Edit this file when scope changes; do not let implementation drift silently.

## Goals

1. A visitor lands inside `/lifecycle/*` or `/acquisition/*` and immediately understands they have left the marketing site and entered an operator console.
2. Persistent left vertical navigation across both demo apps. All stages reachable without scrolling.
3. Color, typography, and density carry meaning — not decoration. The policy-engine band classifications (healthy / watch / unhealthy) become the dominant visual language across the demo apps.
4. The portfolio site visual identity is **untouched**. Differentiation is a one-way claim: demo ≠ portfolio. Portfolio stays as it is.

## Non-goals

- Redesigning portfolio pages (`/`, `/about`, `/projects/*`, `/writing/*`, `/contact`).
- A full design-system component library — only the primitives needed to express the demo shell and a few new mission-control patterns.
- Changing the data model, API contracts, or app routing.
- A/B-tested visual variants. One direction, executed.

## Information architecture

### Demo app shell

Every route under `/lifecycle/*` and `/acquisition/*` is wrapped by `DemoAppShell`. The shell:

- Suppresses the marketing site header and footer.
- Renders an app-level header (env chip, app switcher, breadcrumbs, global status indicator).
- Renders a persistent left navigation rail (~220px, collapses to icons at <960px).
- Reserves the right column for content; max width 1280px, gutters tight.

```
+------------------------------------------------------------+
| [DEMO] Lifecycle  ▼     /Acquisition / Campaigns / Q2 Growth | [● Healthy] |
+------+-----------------------------------------------------+
| Nav  |                                                     |
| rail |                  Content area                        |
|      |                                                     |
+------+-----------------------------------------------------+
```

### Left navigation rail

Two sections per app: primary stages and operations.

**Lifecycle:**
- Overview
- Inputs
- Simulations
- Outputs
- *Operations*
- Audit (post-F1; new route under `/lifecycle/audit`)

**Acquisition:**
- Overview
- Inputs
- Create
- Campaigns
- Simulations
- Outputs
- *Operations*
- Audit

Each item is a row with: an icon (16px), a label, and a status dot when relevant (campaign-level rollups for Acquisition; healthy/watch/unhealthy band aggregated across active campaigns).

The active route is marked by a left-edge accent stripe, not a background fill.

### Breadcrumbs

Shown in the app header. Format: `App / Section / Object / Sub-context`. Examples:
- `Acquisition / Campaigns / Q2 Growth Sprint`
- `Acquisition / Campaigns / Q2 Growth Sprint / Iteration history`
- `Lifecycle / Outputs / Run #4127`

Breadcrumbs are clickable; the last segment is plain text.

### Environment chip

A constant `[DEMO]` badge in the app header — top-left, before the app name. Communicates "you are in a sandbox" so visitors don't think they're staring at production data. Color: muted neutral on a slightly darker neutral (no alarming red).

## Visual language

### Color

Bands map directly to the policy-engine classifications already in `lib/acquisition.ts` (`computeCellSignificance`, `evaluateCampaignPolicy`).

| Token | Hex | Usage |
|---|---|---|
| `--band-healthy` | `#0f6b3b` | Healthy / significant_high / SCALING |
| `--band-watch` | `#a05a00` | Watch / trending_high / TESTING |
| `--band-unhealthy` | `#a02020` | Unhealthy / significant_low / PAUSED |
| `--band-neutral` | `#555555` | Neutral / DRAFT |
| `--band-insufficient` | `#888888` | Insufficient data |
| `--accent` | `#1e6ddc` | Active route, primary CTAs, links |
| `--demo-bg` | (existing demo bg) | Page background |
| `--demo-surface` | `#ffffff` | Card surfaces |
| `--demo-surface-2` | `#f5f5f1` | Nav rail, header strip |
| `--demo-divider` | `#dcdcd6` | Hairlines |

These are tokens, not literal hex usage. Define in `app/globals.css` (or a dedicated `app/demo.css`) and reference via CSS variables so themes are swappable.

### Typography

| Role | Family | Weight | Notes |
|---|---|---|---|
| Body | System sans (existing) | 400/500 | Same as portfolio for accessibility |
| Headlines | System sans | 600/700 | Slightly tighter tracking than portfolio |
| KPI / Metric | `JetBrains Mono`, `Menlo`, monospace | 500 | Tabular numbers for alignment |
| Code / Audit metadata | Same monospace | 400 | Existing `code` style remains |

Demo app body text is **one step smaller** than portfolio (e.g., 14/20 instead of 16/24) to support density. Tables and metric chips use 13/18.

### Density

- Cards: 12px padding (vs 16–20 portfolio).
- Tables: 8px row padding, no zebra striping; thin dividers in `--demo-divider`.
- Metric chips inline: `CAC $145 · ROAS 2.4x · n=320` rendered with monospace, dot separators, no boxes.
- Hairline dividers between sections, not card boxes around everything.

### Status indicators

A `StatusDot` primitive — 8px filled circle in band color. Used in:
- Nav rail (per-route rollup)
- Campaign rows in tables
- Breadcrumb sub-context (reflects current campaign band)
- App header global status (worst band across active campaigns)

## Component primitives

New components to add:

| Component | Path | Purpose |
|---|---|---|
| `DemoAppShell` | `components/demo-shell/DemoAppShell.tsx` | Page wrapper for all demo routes |
| `DemoAppHeader` | `components/demo-shell/DemoAppHeader.tsx` | Env chip, app switcher, breadcrumbs, global status |
| `DemoSideNav` | `components/demo-shell/DemoSideNav.tsx` | Persistent left rail |
| `EnvironmentChip` | `components/demo-shell/EnvironmentChip.tsx` | The `[DEMO]` badge |
| `StatusDot` | `components/demo-shell/StatusDot.tsx` | 8px band-colored dot |
| `MetricChip` | `components/demo-shell/MetricChip.tsx` | Monospace label/value pair |
| `Breadcrumbs` | `components/demo-shell/Breadcrumbs.tsx` | App-aware crumb trail |

Components to refactor or retire:

| Existing | Action |
|---|---|
| `components/site/AppWorkspaceShellNav.tsx` | **Retire** — replaced by `DemoSideNav` |
| `components/acquisition/AcquisitionWorkspaceNav.tsx` | **Retire** — same reason |
| `components/site/Section.tsx` | Keep, adjust padding inside demo shell only |
| Marketing site header/footer | Keep at root layout; conditionally suppressed inside `/lifecycle/*` and `/acquisition/*` |

The marketing header/footer suppression is the cleanest signal that a visitor has left the portfolio and entered a demo app.

## Routing layout strategy

Use Next.js route groups to scope the shell:

```
app/
  layout.tsx                  ← portfolio shell (header, footer)
  (demo)/
    layout.tsx                ← DemoAppShell wrapping
    lifecycle/
      ...
    acquisition/
      ...
```

This is the cleanest separation. Migrating existing routes into a `(demo)` group is a one-time move; route paths don't change for visitors.

## Phased rollout

### Phase 1 — F1: Structural ✅ Shipped (commit 73a8954)

Goal: persistent left rail, demo shell wrapping, marketing chrome removed inside demo routes. **No visual overhaul yet.**

Touches:
- New `DemoAppShell`, `DemoSideNav`, `DemoAppHeader`, `EnvironmentChip` (skeletal styles, no theme tokens yet)
- Move `lifecycle/*` and `acquisition/*` under `app/(demo)/` route group
- Add `(demo)/layout.tsx` and conditionally suppress portfolio header/footer
- Retire `AppWorkspaceShellNav` and `AcquisitionWorkspaceNav` call sites
- Verify all current pages render correctly inside the new shell

Acceptance:
- Visiting `/lifecycle/overview` shows the left rail, no marketing header/footer.
- Visiting `/about` is unchanged.
- All existing tests pass; type-check clean.

### Phase 2 — F2: Visual ✅ Shipped (commit f57b155)

Goal: apply the mission-control visual language. Tokens, typography, density, status colors mapped to bands.

Touches:
- Define color and typography tokens in `app/globals.css` (or `app/demo.css`)
- `MetricChip`, `StatusDot`, `Breadcrumbs` primitives
- Apply tokens across demo cards, tables, KPI displays
- Replace existing inline color literals (e.g., `#0f6b3b` in `CellMatrixExplorer`) with tokens
- Add status rollups to nav rail items

Acceptance:
- A visitor instantly sees the demo apps as visually distinct from the portfolio site (typography scale, accent color, density).
- All band-colored UI uses tokens; no remaining inline color literals for status.
- Existing tests pass; type-check clean.

### Phase 3 — F3: Entry/exit treatment

Goal: explicit transition between portfolio and demo apps so visitors orient on context switch.

Touches:
- Update `/projects/*` case-study pages to surface clear "Open the demo app" affordances with the demo's accent style
- Add a return-to-portfolio link in the demo app header (subtle but present)
- Optional: a brief splash/intro on first entry to a demo app session (one-time, dismissible)

Acceptance:
- Clicking into a demo app from a project case study feels like an intentional handoff, not a layout swap.
- Returning to the portfolio is one click and visually obvious.

## Open questions

Resolve before Phase 1 starts:

1. **Mobile rail.** At <960px, does the rail collapse to a top drawer (hamburger), to icon-only, or stay as-is and scroll horizontally? Recommendation: **icon-only at <960px, top drawer at <640px.**
2. **Status rollup data source.** Per-route status dots in the rail — computed on the server per request, or a lightweight `/api/.../status` endpoint? Recommendation: **server component fetch in the layout** (already paying the DB cost; no need for a client fetch).
3. **Persistence of "current campaign" sub-context.** Should the breadcrumb remember the last-viewed campaign across navigation? Recommendation: **no for v1**, keep stateless; add a session-scoped memory only if it shows up as a real friction point.

## Definitions of done

- F1 ships when all demo routes use `DemoAppShell` + `DemoSideNav` and the marketing header/footer is gone from those routes.
- F2 ships when typography, color tokens, and density updates are applied across both demo apps and no inline status-color literals remain.
- F3 ships when the portfolio↔demo entry/exit is explicit and bidirectional.

After F1+F2 ship, the demo apps should pass a "5-second test": a visitor seeing only a screenshot of the demo app should not mistake it for the portfolio site, and vice versa.
