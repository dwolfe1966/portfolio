# Refinement Specification for David Wolfe Portfolio

This document outlines modifications to the existing portfolio and demonstration apps to improve navigation, positioning, UX clarity, and visual polish. It builds upon the initial implementation specification and reflects the results of a live audit of `davidwolfe.app`.

## Navigation & Information Architecture

1. **Top navigation** – Maintain a clear set of five items: **Home**, **About**, **Projects**, **Writing**, and **Contact**.  Research on website menus suggests shorter labels and a limited number of items improve engagement and reduce decision fatigue【458732127021119†L27-L38】.  The existing `NavBar` component already implements this design; ensure it is used across all pages and add a mobile hamburger menu (TODO).  Update the links to point to newly added pages such as the Projects index and the enhanced About page.

2. **Projects index** – Provide a `/projects` landing page that lists all case studies.  Each entry should include a title, summary, and a “View Project” button.  The current `ProjectsPage` component lists two projects (Lifecycle Revenue Engine and Agent‑Managed Acquisition); extend this list as new projects are added.

3. **Writing index** – Create `/writing` to list essays such as “Generic lifecycle marketing is dying”.  Each essay should display a title, excerpt, and “Read Essay” link.

## About Page Enhancements

The about page must communicate the full breadth of David’s expertise—not just revenue systems.  The new `AboutPage` component demonstrates an expanded layout:

* **Introduction** – Briefly describe David’s background and current focus.
* **Core competencies** – Use a grid to outline key skill areas: product discovery & design, growth & monetisation, data science & AI, and organisational leadership.  Tailor these lists to your actual experience.
* **Experience & milestones** – Provide a timeline of major career roles or accomplishments.  The skeleton uses three time ranges as placeholders.
* **Approach & philosophy** – Explain how you think about product, growth, AI, and teams.  Keep paragraphs succinct and emphasise the “intersection of strategy and execution.”

## Lifecycle Demo Improvements

1. **Scoring settings** – Replace hard‑coded priority weights with an interactive panel allowing users to adjust weights for interest score, recency, segment value, and change significance.  The `ScoringSettings` component uses sliders and numeric inputs to edit these values.  It automatically renormalizes other weights when one is changed and includes lock checkboxes so users can fix specific weights while adjusting others【574565776970297†L202-L214】【574565776970297†L274-L280】.

2. **Variable definitions panel** – Introduce a `VariableDefinitions` component that lists all input and output variables with their names, types, descriptions, and example values.  This ensures users understand what each assumption means and what metrics are produced.  The component groups variables into *input* and *output* categories and can be embedded in the lifecycle demo.

3. **Simulation interactivity** – Expand the scenario lab to allow users to vary assumptions such as open rate, click‑through rate, conversion rate, and revenue per event.  Provide sliders or numeric inputs and update the outcome charts in real time.  Create simple bar and line charts using `SimulationCharts` with guidance from data‑visualisation best practices (e.g., reduce clutter, use limited colours, and label axes clearly)【429982028471656†L142-L167】【429982028471656†L174-L186】.

4. **Pipeline diagram** – Ensure the pipeline flowchart image is displayed in the lifecycle project page.  Use the existing `PipelineDiagram` component and confirm that the `public/images/pipeline.png` file is present.  The diagram should show how events become candidates, generate messages, and lead to outcomes.

## Acquisition Demo (Project 2)

The second case study demonstrates an agent‑managed acquisition system.  Implement the following assets:

1. **Project page** – The new file `projects/agent-acquisition/page.tsx` outlines the structure: hero description, problem statement, thesis, architecture, commercial framing, what you built, and a link back to the projects list.  Use the `AcquisitionFlowDiagram` component to visualise the data flow from campaign setup through creative generation, audience selection, test cells, budget shifts, and performance analytics.  The diagram image lives at `public/images/acquisition_flow.png`.

2. **Acquisition flow diagram** – Generate an abstract flowchart image (included in `public/images/acquisition_flow.png`) that illustrates the architecture.  The design should be clean and modern, with labelled boxes connected by arrows representing **Campaign Setup → Creative Generation → Audience Selection → Test Cells → Agent Orchestrator → Ad Platforms → Performance Analytics**.

3. **Data model & API** – Extend the schema to include tables such as `Campaign`, `AdCreative`, `AudienceSegment`, `TestCell`, `AdPerformance`, and `BudgetActivity` as described in the architecture document.  Provide REST or Next.js API endpoints for creating campaigns, generating creatives, starting tests, fetching performance metrics, and logging budget changes.  These APIs should integrate with OpenAI for text generation and simulate ad network responses.

4. **Simulation UI** – Create a stubbed acquisition dashboard (`/demo/acquisition/dashboard`) where users can: (a) launch a new campaign with a form for objective, budget, channels, and timeframe; (b) preview AI‑generated creatives and audience suggestions; (c) run a simulation that shows performance metrics such as impressions, clicks, conversions, CAC, ROAS, and budget reallocations over time; and (d) drill into individual test cells.  Use charts to visualise these metrics.  Allow users to lock budgets or override AI decisions.

5. **Audit & Controls** – Record every automated action (creative selection, budget shift) in an audit log.  Provide an interface to review the log and to adjust constraints (e.g., minimum run time, maximum budget shift percentage).  Make these controls clearly visible but non‑intrusive.

## Visual Design & Copy

1. **Consistent palette & typography** – Adopt a restricted colour palette (primary blue, secondary gray, neutral backgrounds) and a consistent font scale.  Limit decorative effects; rely on whitespace and typography for hierarchy【429982028471656†L142-L167】.

2. **Avoid repetition** – Review the copy across all pages and consolidate similar statements.  Each section should deliver unique information; avoid using identical phrasing on multiple pages.

3. **Contextual explanations** – Add tooltips or info icons next to jargon (e.g., *interest score*, *segment value*) that briefly explain the term.  Provide an introductory modal for first‑time users of the demos.

## Deliverables

This specification accompanies several code and visual assets:

* **`NavBar.tsx`** – Implements the navigation bar.
* **`ProjectsPage`** – Lists case studies.
* **`AboutPage`** – Expanded about page with competencies, timeline, and philosophy.
* **`VariableDefinitions.tsx`** – Component for listing input/output variables and definitions.
* **`ScoringSettings.tsx`** – Component for adjusting model weights.
* **`SimulationCharts.tsx`** – Component for rendering bar and line charts of simulation results.
* **`PipelineDiagram.tsx`** – Displays the lifecycle pipeline image.
* **`AcquisitionFlowDiagram.tsx`** – Displays the acquisition architecture diagram.
* **`projects/agent-acquisition/page.tsx`** – Project page for the acquisition system.
* **`public/images/pipeline.png`** and **`public/images/acquisition_flow.png`** – Diagram images.

Use this specification as a guide for integrating the new components, pages, and visuals into the overall portfolio.  The goal is to elevate the demos from basic prototypes to polished, credible SaaS experiences that clearly articulate both the “how” and the “why” behind each system.