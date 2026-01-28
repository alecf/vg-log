# Project Guidelines

Video game time tracking app for families. Parents set limits, kids log sessions.

## Tech Stack

- **Monorepo**: npm workspaces with `apps/` and `packages/`
- **API** (`apps/api`): Cloudflare Workers, Hono, tRPC, Drizzle ORM, D1 (SQLite)
- **Web** (`apps/web`): React, TanStack Router, tRPC client, Tailwind CSS, Zustand
- **Shared** (`packages/shared`): Types and schemas shared between API and web

## Commands

```bash
npm run dev          # Start both API and web in dev mode
npm run build        # Build all workspaces
npm run typecheck    # Type check all workspaces

# Database
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Apply migrations locally
npm run db:studio    # Open Drizzle Studio

# Deploy
npm run deploy -w api   # Deploy API to Cloudflare Workers
npm run deploy -w web   # Deploy web to Cloudflare Pages
```

## Project Structure

```
apps/
  api/
    src/
      db/           # Schema and database setup
      lib/          # Utilities (trpc context, helpers)
      routers/      # tRPC routers (one per domain)
      index.ts      # Hono app entry point
    drizzle/        # SQL migration files
  web/
    src/
      routes/       # TanStack Router file-based routes
      stores/       # Zustand stores
      hooks/        # Custom React hooks
      lib/          # Utilities (trpc client, helpers)
packages/
  shared/           # Shared types and Zod schemas
```

## Database Migrations

Migrations must always be **forward-compatible**:

- **Never delete columns or tables** - mark as deprecated instead, remove in a future release after confirming no code references them
- **Never rename columns or tables** - add a new column/table, migrate data, then deprecate the old one
- **Always add columns as nullable** or with a default value so existing rows remain valid
- **Backfill data** in the same migration when adding columns that should have values for existing rows

This ensures zero-downtime deployments where old code can still run against the new schema during rollout.

## API Conventions

### tRPC Routers

- One router file per domain (e.g., `session.ts`, `limit.ts`)
- Use `protectedProcedure` for authenticated routes
- Use `childProcedure` or `parentProcedure` for role-specific routes
- Validate inputs with Zod schemas
- Return typed objects, not raw database rows

### Error Handling

- Use `TRPCError` with appropriate codes (`NOT_FOUND`, `FORBIDDEN`, `BAD_REQUEST`)
- Include helpful error messages for debugging

### Timestamps

- Store as Unix timestamps (integers) in the database
- Convert to/from `Date` objects at the API boundary
- Use family timezone for day/week calculations

## Frontend Conventions

### Routes

- File-based routing with TanStack Router
- Each route is a self-contained component in `routes/`
- Use `createFileRoute` to define routes

### State Management

- **Server state**: tRPC + React Query (automatic caching/invalidation)
- **Client state**: Zustand stores for UI state that persists across routes
- Prefer server state over client state when possible

### Styling

- Tailwind CSS with `cn()` utility for conditional classes
- Use CSS variables for theme colors (defined in `index.css`)
- Mobile-first design - this is primarily a mobile app

### Components

- Keep components in route files unless reused
- Extract to `components/` only when shared across multiple routes
- Use native HTML elements and inputs for mobile compatibility

## Mobile UX

This app is primarily used on mobile devices:

- Minimum touch target: 44x44px
- Use native inputs (`type="time"`, `type="date"`) for OS pickers
- Keep important actions in thumb-reach zone (bottom of screen)
- Test on actual mobile devices, not just browser dev tools
