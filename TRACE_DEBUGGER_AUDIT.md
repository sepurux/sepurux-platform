# Trace Debugger Audit

## Repo split
- `site/` is the public marketing site.
- `ui/` is the authenticated product app.

## Current entry points
- Landing page: `site/app/page.tsx`
- Public sandbox: `site/app/sandbox/page.tsx`
- App home: `ui/app/page.tsx`
- Dashboard compatibility route: `ui/app/dashboard/page.tsx`

## Routing and auth
- `ui/components/layout/shell-frame.tsx` gates authenticated routes and redirects unauthenticated users to `/auth`.
- `ui/app/auth/page.tsx` renders the access portal.
- `ui/components/auth/access-portal.tsx` handles demo vs access mode and is currently framed around workspace creation.

## Trace flow
- `ui/lib/api.ts` already exposes `listTraces`, `getTrace`, and `getTraceTimeline`.
- There is no `createTrace` helper yet, even though backend docs support `POST /v1/traces`.
- Public `site/app/sandbox/page.tsx` currently shows seeded example traces, not a paste-and-analyze flow.

## Mutation / replay surfaces
- Existing advanced surfaces live in `ui/app/runs`, `ui/app/campaigns`, `ui/app/mutation-packs`, `ui/app/policies`, `ui/app/security`, and their associated components.
- The product already has replay, mutation, CI, and policy infrastructure, so the first pass can reframe rather than remove it.

## Copy baseline
- The landing page and app UI are still primarily platform/reliability oriented.
- User-facing billing language is heavily credit-first and needs to be reframed as runs, analyses, or tests.
