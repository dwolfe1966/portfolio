# Visual Design Agent Brief — S8 Evaluation Request

Date: 2026-04-25

## Objective
Evaluate visual quality and information hierarchy across:
1. Home page
2. About page
3. Lifecycle app (`/lifecycle/*`)
4. Acquisition app (`/acquisition/*`)

## Requested outputs
- Visual audit with prioritized findings (critical/high/medium)
- Updated imagery/infographic recommendations per surface
- Concrete component-level suggestions (spacing, typography, contrast, chart styling, iconography)
- Accessibility checks (color contrast, focus states, keyboard cues)

## Context
S8 now includes campaign workflow pages and operator controls. The UI has baseline infographics, but needs a professional design pass for:
- stronger visual hierarchy
- consistent infographics
- cleaner data-density handling
- polished empty/error/loading states

## Candidate surfaces
- `app/page.tsx` (home infographic section)
- `app/about/page.tsx` (operator profile infographic)
- `app/lifecycle/overview/page.tsx` (outcome infographic + pipeline visuals)
- `app/acquisition/overview/page.tsx` (acquisition architecture infographic)
- `app/acquisition/campaigns/[id]/page.tsx` + `components/acquisition/AcquisitionOperatorControls.tsx`

## Deliverable format
Please provide:
- Before/after mock direction notes
- Token-level recommendations (colors, spacing, type scale)
- Proposed component updates with exact file targets
