# Acquisition & Demo Spec Impact Summary

Date: 2026-04-24

This summary captures key changes from the two provided specifications and maps each to backlog impact.

## Key changes identified

1. **Navigation remains 5-item, but mobile hamburger is now explicit**
   - Keep: Home / About / Projects / Writing / Contact
   - Add: responsive collapse behavior for small screens.

2. **Projects and Writing become durable index surfaces**
   - Projects index should scale with more case studies.
   - Writing index should include title + excerpt + CTA pattern.

3. **Lifecycle demo must improve explainability UX**
   - Add explicit scoring-weight control UI with lock + auto-rebalance.
   - Add variable definitions panel (input/output data dictionary).
   - Add richer simulation charts (pipeline + funnel + trend) with low visual clutter.
   - Add contextual tooltips and first-time intro modal.

4. **Lifecycle and acquisition diagrams are first-class assets**
   - `pipeline.png` used in lifecycle overview/project context.
   - `acquisition_flow.png` used in acquisition project and workspace context.

5. **Acquisition prototype scope is expanded from overview pages to operational workflow pages**
   - Campaign list/create/detail and analytics dashboard are expected.
   - Operator controls include budget locks and override capabilities.
   - Audit feed should expose automated decision logs.

6. **Copy and visual polish requirements are now explicit**
   - Remove repeated phrasing across top-level pages.
   - Keep palette restrained and prioritize readability over decoration.

## Backlog impact mapping

- **B10**: Scoring settings UI (interactive weights + lock + rebalance)
- **B11**: Variable definitions panel
- **B12**: Simulation charts/funnel visuals
- **B13**: Contextual tooltips + first-run intro modal
- **C16**: Acquisition flow diagram integration
- **C17**: Acquisition analytics charts
- **C18**: Acquisition campaign workflow pages (list/create/detail)
- **C19**: Operator override controls (budget locks/constraints)
- **C20**: Scenario and Monte Carlo control surfaces
- **D10**: Mobile hamburger nav behavior
- **D11**: Lifecycle/acquisition diagram embedding
- **D12**: Copy de-duplication pass

## Recommended implementation order

1. D10 + B10 + B11 (navigation + explainability controls)
2. B12 + D11 + C16 (visual explanation layers)
3. C18 + C19 + C17 (acquisition operational depth)
4. C20 + B13 + D12 (advanced controls and polish)
