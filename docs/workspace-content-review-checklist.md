# Workspace Content Review Checklist

Last updated: 2026-05-18

Use this checklist before shipping new workspace sections, controls, or page copy. The goal is to keep the protected workspace clear as the product becomes more feature-rich.

## Page Fit

- The change belongs on the selected page according to `docs/workspace-ia-gap-analysis.md`.
- The page still answers one primary user question.
- The section has one obvious user job, status, or decision.
- The section does not duplicate another workspace page's responsibility.

## User Clarity

- The primary CTA is visible before secondary actions.
- Labels describe what the user can do now, not what we plan to build later.
- Empty states explain the next concrete action.
- Disabled states explain the missing requirement in one sentence.
- Operational warnings are specific and tied to the affected workflow.

## Complexity Control

- Internal roadmap notes live in docs or a collapsed implementation note.
- Debug/raw metadata is collapsed under technical details.
- Long readiness details are summarized first, with details lower on the page.
- Repeated cards, tables, and controls have stable scan patterns.
- The change does not add another top-level workspace page unless the existing page contract cannot absorb it cleanly.

## Customer-Safe Surfaces

- `Report` copy is stakeholder-readable and avoids migration, debug, or internal implementation language.
- `Dashboard` copy points users to the next action before secondary health summaries.
- `Connections` copy stays focused on source setup, not architecture roadmap.
- `Agents` copy stays focused on approvals, jobs, provider writes, evidence, and governance.
- `Account` copy stays focused on profile, members, invites, roles, and audit.

## Release Check

- The backlog item names any intentional temporary/internal content.
- The implementation either removes legacy promo/demo copy or explains why it remains.
- Screens with new text or controls are checked on mobile-width layouts.
- `npm run build` passes for UI changes.
