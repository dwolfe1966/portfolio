# Workspace IA and Gap Analysis

Last updated: 2026-05-18

This document defines the job of each protected workspace page. The goal is to keep the workspace useful as an enterprise operating surface without asking customers to decode internal roadmap notes, legacy demo copy, or implementation scaffolding.

## Operating Principle

Each workspace page should answer one primary user question.

Roadmap notes, implementation reminders, and future-state architecture should either live in `docs/` or be clearly marked as temporary implementation context. Customer/operator pages should prioritize current status, next action, and safe controls.

## Page Contracts

| Page | Primary question | Keep here | Move out or reduce |
|---|---|---|---|
| Dashboard | What should I do next? | Launch readiness, primary next action, workspace health, recent evidence, active data summary. | Deep tables, product roadmap explanations, long tool education. |
| Datasets | What data exists and is usable? | Saved source configs, imported snapshots, row coverage, readiness gaps, source/dataset detail. | Provider connection setup, roadmap copy, raw metadata except in collapsed debug details. |
| Connections | Where does data come from? | Connector choices, credential/source setup entry points, saved connection inventory, source-to-dataset explanation. | Lifecycle architecture blueprint and provider hardening notes from the primary flow. |
| Agents | What automated work is queued, gated, or waiting for approval? | Worker status, approvals, jobs, dry-runs, handoffs, governance posture, launch execution gates. | General product positioning and long conceptual explanations. |
| Report | What can we show a customer or stakeholder? | Customer-safe launch posture, evidence status, blockers, exports, operating implications. | Internal implementation status, debug copy, migration reminders where avoidable. |
| Account | Who has access to this workspace? | Profile, members, invites, roles, membership audit. | Connector credentials and broad workspace settings. Consider tabs/subpages as this grows. |
| Settings | How is this workspace configured? | Workspace identity, launch evidence settings, owner/system/baseline evidence, admin configuration. | Historical account-layer roadmap notes that no longer match shipped behavior. |
| Activity | What happened? | Chronological audit/event log, filters, exports. | Configuration actions and explanatory roadmap content. |

## Navigation Groups

| Group | Pages | Job |
|---|---|---|
| Operate | Dashboard, Agents, Report | Decide what to do next, review execution work, and share launch posture. |
| Data | Datasets, Connections | Connect sources, inspect usable snapshots, and resolve readiness gaps. |
| Admin | Account, Settings, Activity | Manage access, configure evidence/settings, and audit what happened. |

## Content Taxonomy

| Content type | Workspace treatment |
|---|---|
| Current user action | Show prominently with one clear CTA. |
| Operational status or blocker | Show near the affected workflow. Keep copy short and concrete. |
| Safety/readiness gate | Keep visible when it affects execution, approvals, launch, or billing. |
| Internal roadmap note | Move to docs or a collapsed implementation note. |
| Legacy promotion/demo reminder | Remove or rewrite as current product behavior. |
| Future-state provider note | Convert to a disabled state or short requirement label. |
| Raw/debug metadata | Collapse under technical details. |

## Current Gaps

- Dashboard has the right data but should keep steering users toward one next action before secondary health summaries.
- Connections has been carrying both real connector setup and lifecycle integration roadmap content. The roadmap content should not be part of the primary operator flow.
- Agents is powerful but dense. The next structural step is to group it into status, approvals, jobs, provider writes, and evidence sections.
- Account now includes profile, members, invites, role policy, and audit. The next structural step is tabs or subpages for `Profile`, `Members & Invites`, and `Audit`.
- Settings contained account-layer roadmap copy that is now stale because membership and invite administration have shipped.
- Report should remain the most stakeholder-readable workspace page, with no migration/debug or internal implementation language in the primary flow.

## Recommended Follow-On Work

1. Add visual grouping or subnavigation to Account and Agents before adding more controls.
2. Keep Connections focused on source setup and move connector architecture notes into docs.
3. Keep Dashboard as the command center, with one primary next action and secondary health signals.
4. Review Report copy for stakeholder-safe language after every launch-readiness feature.
5. Add a lightweight content review checklist to future workspace backlog items.
