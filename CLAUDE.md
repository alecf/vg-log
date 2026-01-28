# Project Guidelines

Video game time tracking app for families. Parents set limits, kids log sessions.

## Tech Stack

- **Monorepo**: npm workspaces with `apps/` and `packages/`
- **API** (`apps/api`): Cloudflare Workers, Hono, tRPC, Drizzle ORM, D1 (SQLite)
- **Web** (`apps/web`): React, TanStack Router, tRPC client, Tailwind CSS, Zustand
- **Shared** (`packages/shared`): Types and schemas shared between API and web

## Code Quality Principles

### Keep It Simple

- **YAGNI** (You Aren't Gonna Need It) - Don't build features or abstractions until they're actually needed
- **Prefer clarity over cleverness** - Code is read far more than it's written
- **Avoid premature optimization** - Make it work, make it right, then make it fast (only if needed)

### SOLID Principles

- **Single Responsibility** - Each function/module should do one thing well
- **Open/Closed** - Open for extension, closed for modification (use composition)
- **Liskov Substitution** - Subtypes must be substitutable for their base types
- **Interface Segregation** - Prefer small, focused interfaces over large ones
- **Dependency Inversion** - Depend on abstractions, not concretions (use dependency injection for testability)

### DRY (Don't Repeat Yourself)

- Extract repeated logic into shared functions
- But don't over-abstract - duplication is better than the wrong abstraction
- Rule of three: consider extracting after the third repetition

### Naming

- Use descriptive, intention-revealing names
- Functions should be verbs (`getUserById`, `calculateTotal`, `validateInput`)
- Booleans should read as questions (`isActive`, `hasPermission`, `canEdit`)
- Avoid abbreviations except for well-known ones (`id`, `url`, `api`)

### Functions

- Keep functions small and focused (ideally < 20 lines)
- Limit parameters (ideally ≤ 3, use objects for more)
- Avoid side effects where possible - prefer pure functions
- Return early to avoid deep nesting

### Error Handling

- Handle errors at the appropriate level - don't swallow them silently
- Provide context in error messages
- Use typed errors (like `TRPCError`) over generic throws
- Validate inputs at system boundaries (API endpoints, form submissions)

### TypeScript Specific

- Use strict mode - leverage the type system fully
- Prefer `interface` for object shapes, `type` for unions/intersections
- Avoid `any` - use `unknown` and narrow with type guards
- Use Zod for runtime validation that mirrors TypeScript types

### Testing Mindset

- Write code that's easy to test (pure functions, dependency injection)
- Consider edge cases: empty arrays, null values, boundary conditions
- If something is hard to test, it's often a sign the design could be improved

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
