# Agent instructions — Task Flow Be

Instructions for future AI coding agents working in this backend repository.

## Read first

Before implementing anything:

1. [`README.md`](./README.md) — purpose, planned stack, placeholders
2. [`../docs/PRD.md`](../docs/PRD.md) — product scope and accepted product rules
3. [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — system design
4. [`../docs/DECISIONS.md`](../docs/DECISIONS.md) — ADRs and decision status

This repository is backend-only. Do not add a React app here. Do not claim the server runs until a real toolchain exists.

## Ask before major architecture changes

Do not switch to microservices, replace PostgreSQL/Prisma, replace REST + Socket.IO, move AI keys to the client, or change server-managed sessions and HttpOnly cookies to `localStorage` JWTs without an explicit human decision and an ADR update.

Do not add board-level roles, independent board memberships, or board-level permission overrides in the MVP without explicit human approval and a new ADR.

Do not replace Yjs collaborative notes with last-write-wins document replacement without explicit human approval and a new ADR.

Redis and BullMQ are optional and require a concrete background-job need. Do not introduce Redis solely for collaborative notes.

## Product rules that must remain consistent

- Architecture is a **modular monolith**, not microservices.
- The **workspace is the tenancy and authorization boundary**. Workspace membership roles apply to every board in that workspace; there are no independent board-level role overrides in the MVP.
- Task status is **derived from the task's column**. Do not introduce a separate status field that can contradict the column. Columns should have a semantic category where needed (for example, `todo`, `in_progress`, `done`) separate from their display name.
- Role permissions:
  - **Owner:** full workspace control; can grant/revoke Admin roles, manage membership, archive/restore and permanently delete boards, delete the workspace, and transfer ownership through a dedicated operation.
  - **Admin:** can manage Members and Viewers and change their roles; can archive/restore boards; cannot grant/revoke Admin roles, affect the Owner, permanently delete boards, delete the workspace, or transfer ownership.
  - **Member:** can create/edit/move/reorder tasks and edit shared notes; cannot manage membership/roles or create/manage/archive/restore/delete boards.
  - **Viewer:** read-only access to authorized workspace content.
- An Owner must not be removed or demoted through ordinary membership operations. Ownership transfer is a separate, explicit operation.
- Archiving is reversible and is not permanent deletion. Do not invent a cascade or retention policy for permanent board deletion; define and document the lifecycle of related columns, tasks, notes, and activity before implementing it.
- Shared notes use **Yjs** for concurrent document state and **TipTap** as the editor on the client. **Socket.IO** is the planned collaboration transport, and **PostgreSQL** must durably store Yjs updates and/or snapshots. Exact storage format and synchronization protocol remain implementation decisions to document before they are relied upon.
- Private notes, AI model training, and voice features are out of scope for v1.
- AI is optional and must degrade gracefully when the provider is missing, unavailable, or rate-limited.

## Prefer small, reviewable changes

- Keep HTTP handlers thin; put business rules in domain services.
- Implement one vertical slice at a time (for example, session login, then workspace creation).
- Do not generate the entire schema, all routes, and workers in one unsolicited pass.
- Keep REST and Socket.IO behavior consistent by reusing domain services and authorization rules.

## Authorization and security

- Enforce workspace-level authorization on every relevant REST route and Socket.IO room join/event handler, including boards, columns, tasks, shared notes, activity, analytics, notifications, and AI context.
- Re-check authorization for socket operations; a client-supplied workspace or board ID is never proof of access.
- Enforce the role matrix on the server. Frontend guards are only a UX aid.
- Validate inputs at API boundaries.
- With cookie-based sessions, implement an explicit CSRF/origin-check strategy for state-changing HTTP requests.
- Never hardcode secrets (`DATABASE_URL`, `SESSION_SECRET`, `GEMINI_API_KEY`, Redis URLs).
- Never log cookies, passwords, session identifiers, or provider keys.
- Never expose provider API keys in REST responses or Socket.IO payloads.
- Use a stub/fake AI provider in tests. Do not call live Gemini unless the user asks and secrets are provided through environment configuration, not source code.

## Persistence and real-time behavior

- Persist committed board/task changes before publishing corresponding Socket.IO events. Do not publish events for failed or rolled-back writes.
- Socket.IO broadcasts are not durable storage or a guaranteed replay log. Treat events as notifications of committed state; clients may refetch after reconnect.
- Persist collaborative note state (Yjs updates and/or snapshots) in PostgreSQL. A successful socket broadcast alone does not mean an edit is durable.
- Design for authorization, concurrent edits, duplicate/retried updates, reconnect and restoration, and persistence failures. Do not acknowledge an edit as durably saved before the persistence path confirms it.
- If stronger delivery guarantees are later needed for ordinary domain events, document the trade-off and consider an outbox rather than claiming persist-then-emit is atomic.

## Tests

When implementing behavior, add or update tests:
- Unit tests for domain rules and the complete workspace role matrix.
- Integration tests for HTTP validation, authentication, authorization, and persistence.
- Socket tests for authorized room joins, forbidden mutations, and persist-before-publish behavior.
- Shared-note tests for concurrent Yjs edits, unauthorized reads/writes, reconnect/restoration from PostgreSQL, and persistence failures.
- Tests must verify that viewers cannot mutate, Admins cannot grant/revoke Admin roles or affect the Owner, and only the Owner can permanently delete boards.

Never weaken authorization, skip validation, or disable CSRF/session checks to make tests pass.

## Scope and dependencies

- Do not install dependencies, run `npm`, Prisma, Docker, or database setup unless the user asked for that step.
- Do not add features outside the requested scope or outside the PRD MVP.
- Do not initialize Git in the parent `AI_Task_Flow/` folder.
- Do not modify the frontend repository unless the task says to.
- Do not claim an implementation, test, metric, or deployment exists unless it has actually been completed and verified.

## Design decisions

Record architectural changes and meaningful trade-offs in `../docs/DECISIONS.md`. Treat unresolved implementation details as open; do not silently choose a synchronization protocol, note storage format, or permanent-deletion cascade policy without documenting the decision.
