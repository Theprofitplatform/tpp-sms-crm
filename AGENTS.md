# Repository Guidelines

## Project Structure & Module Organization
This monorepo groups runtime code under `apps/`, shared libraries under `packages/`, async workloads under `worker/`, environment assets under `infra/`, and API collections in `postman/`. The API and web clients live in `apps/api` and `apps/web` with `src/` trees and `routes/health.ts` checks. Reusable TypeScript helpers belong in `packages/lib/src/index.ts`, and tests sit beside code in `__tests__/` or `*.spec.ts` folders.

## Build, Test, and Development Commands
- `pnpm install` bootstraps the workspace.
- `pnpm run dev:api`, `pnpm run dev:web`, and `pnpm run dev:worker` start watch-mode servers for each surface.
- `pnpm run lint` executes the shared ESLint/Prettier config; use `--fix` locally when safe.
- `pnpm run test` runs the Vitest suite; add `--coverage` before merging substantial changes.
- `docker compose -f infra/docker-compose.yml up --build` brings up Postgres, Redis, and all services for integration testing.

## Coding Style & Naming Conventions
Target Node 20 and strict TypeScript. Use 2-space indentation, single quotes, and trailing commas per the shared `.prettierrc`. Keep filenames lowercase with hyphens (`message-template.service.ts`) and mirror folder names across services (`apps/api/src/services`, `apps/web/src/components`). Prefer `PascalCase` for classes, `camelCase` for functions, and uppercase snake case for environment variables; re-export only typed interfaces from package entry points.

## Testing Guidelines
Vitest drives unit and integration tests; colocate specs with the code under test and suffix files with `.spec.ts`. Focus on deterministic tests for queue gating, health endpoints, and import flows. For database changes, add Drizzle migration checks in `infra/migrations/__tests__` against the Postgres container via `pnpm run test:db`, and document coverage gaps in the PR description.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat: queue budget gate`) so release tooling can infer versions. Keep commits scoped to a single work order milestone and include migration snapshots or Postman examples when relevant. Pull requests should link the corresponding work order, describe functional changes, list executed test commands, and attach screenshots or GIFs for UI updates. Request review from the domain lead most impacted by the changes.

## Security & Configuration Tips
Never commit secrets; copy `.env.example` into `.env.local` and populate only local values. Keep provider API keys in Docker secrets and reference them via `${VAR}` in compose files. When exposing new endpoints, update the Postman collection and document signature validation in `infra/README.md`. For webhook handlers, add replay protection and timestamp validation before persisting events or mutating tenant state.
