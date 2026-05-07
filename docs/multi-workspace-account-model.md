# Multi-Workspace Account Model

Last updated: 2026-05-07

This note defines the account and workspace model to use before adding team collaboration, client hierarchies, or production customer onboarding.

## Product Goal

The workspace platform should support three usage modes without changing the product apps:

- Anonymous visitor: can open each tool immediately with shared sample data.
- Individual account: can import data, save source configs, select active datasets, and see only their own workspace records.
- Team or client workspace: can share datasets, connectors, presets, and agent activity across authorized members.

## Core Concepts

| Concept | Purpose | Current state | Future state |
|---|---|---|---|
| AccountUser | Human identity for login, ownership, and audit. | Exists. | Remains the principal actor for sessions and actions. |
| Workspace | Operating boundary for datasets, sources, presets, connectors, and activity. | Default workspace exists. | Multiple workspaces per user, with explicit membership. |
| WorkspaceMembership | Links users to workspaces. | Exists for default workspace. | Adds role, status, invitation, and last-active metadata. |
| WorkspaceDataset | Imported data snapshot a tool can apply. | Account-owned and workspace-linked. | Owner plus visibility scope: personal, workspace, client, or archived. |
| Source config | Saved CSV, Sheets, OAuth, or future live-source mapping. | Account-owned lifecycle mapping preset. | Generalized connector/source config with workspace visibility. |
| Active data source | Per-tool selection of sample or imported data. | Account-scoped. | Workspace-scoped when a team opts into shared active sources. |
| Connector credential | OAuth/API credential for external systems. | Account-scoped ad connection. | Account-owned credential grants with workspace-level access policies. |
| Agent run | Agent action, simulation, import, or output generation event. | Partially account-scoped. | Fully actor-scoped and workspace-scoped for auditability. |

## Visibility Model

Use a small explicit visibility vocabulary everywhere:

- `shared_sample`: seed/sample/default rows available without an account.
- `personal`: owned by the signed-in account and not visible to other users.
- `workspace`: visible to members of the workspace according to role.
- `client`: visible to an agency/customer parent workspace and one client workspace.
- `archived`: retained for audit but not selectable for new runs.

Current implementation only needs `shared_sample`, `personal`, and a display placeholder for `workspace` / team-shared records. Do not add team editing flows until the database model and audit policy support them.

## Role Model

| Role | Capabilities |
|---|---|
| Owner | Manage workspace identity, members, billing model, connectors, and destructive data actions. |
| Admin | Manage sources, imports, datasets, presets, and agent policies. Cannot transfer ownership or billing. |
| Operator | Run tools, apply datasets, launch simulations, approve agent actions within policy. |
| Analyst | View datasets, outputs, readiness, and audit logs. Can export but cannot mutate. |
| Client viewer | Read-only access to selected outputs, activity, and performance reports. |

For the current portfolio product, keep every signed-in user as an implicit owner of their personal default workspace.

## Data Boundaries

Future queries should resolve access through workspace membership instead of ad hoc `accountUserId` filters:

1. Resolve session account.
2. Resolve selected workspace membership.
3. Apply role and visibility policy.
4. Filter records by workspace and visibility.
5. Record actor id, workspace id, source id, and policy version on mutating actions.

Personal records should remain tied to both `accountUserId` and `workspaceId` so a user can later promote a personal dataset into a shared workspace dataset without losing provenance.

## Suggested Schema Direction

Add these fields or tables when collaboration work begins:

- `WorkspaceMembership.role`, `status`, `invitedById`, `lastActiveAt`.
- `WorkspaceDataset.visibility`, `ownerAccountUserId`, `promotedFromDatasetId`.
- `LifecycleMappingPreset.visibility`, or replace with a generalized `WorkspaceSourceConfig`.
- `AppDataSourceSelection.workspaceId`, `visibility`, and optional `selectedByAccountUserId`.
- `WorkspaceAuditEvent` for imports, dataset apply actions, connector changes, policy changes, and agent actions.
- `ConnectorCredentialGrant` to separate encrypted account credentials from workspace-level permission to use them.

## Agent And Performance-Business Implications

Production "David Wolfe" agents should never act only from a login session. They need a durable execution context:

- workspace id
- customer/client id when applicable
- actor account id or service-agent id
- connector credential grant id
- policy id and policy version
- source dataset/config ids
- approval state and economic guardrails

This is required for performance-based pricing because fee triggers need defensible baselines, attributable actions, and auditable lift calculations.

## Migration Path

1. Keep anonymous sample behavior unchanged.
2. Keep personal account ownership as the default for imports, presets, selections, and connections.
3. Add visibility fields and labels before adding shared mutations.
4. Add workspace switcher and selected workspace session state.
5. Add invitations and roles.
6. Add promotion flow from personal dataset/source to shared workspace dataset/source.
7. Add audit events and approval policy enforcement.
8. Add client hierarchy and performance-report visibility after role checks are stable.

## Open Decisions

- Whether a customer account maps one-to-one to a workspace or can own multiple workspaces.
- Whether agency/client hierarchy should be modeled as parent-child workspaces or as organizations containing workspaces.
- Whether active data-source selection should default to personal or shared when a team workspace exists.
- Whether connector credentials can be shared directly, or only through limited grants with explicit scopes.
- How long imported snapshots and audit events must be retained for revenue-share disputes.
