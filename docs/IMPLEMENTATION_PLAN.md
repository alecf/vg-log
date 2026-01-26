# VG-Log: Implementation Plan

## Project Structure

```
vg-log/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── routes/         # TanStack Router pages
│   │   │   ├── lib/            # Utilities, tRPC client
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   └── styles/         # Global styles
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                    # Cloudflare Worker API
│       ├── src/
│       │   ├── routers/        # tRPC routers
│       │   ├── db/             # Drizzle schema & migrations
│       │   ├── middleware/     # Auth, logging, etc.
│       │   └── index.ts        # Worker entry point
│       ├── wrangler.toml
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types, validation schemas
│       ├── src/
│       │   ├── schemas/        # Zod schemas
│       │   └── types/          # TypeScript types
│       └── package.json
│
├── package.json                # Root package.json (workspaces)
├── pnpm-workspace.yaml
├── tsconfig.json               # Base TypeScript config
└── turbo.json                  # Turborepo config (optional)
```

---

## Implementation Phases

### Phase 1: Project Setup & Infrastructure

**Goal:** Set up the monorepo, development environment, and basic infrastructure.

#### Tasks:

1. **Initialize monorepo with pnpm workspaces**
   - Create root `package.json` with workspaces config
   - Set up `pnpm-workspace.yaml`
   - Configure shared TypeScript settings

2. **Set up frontend app (`apps/web`)**
   - Initialize Vite + React + TypeScript
   - Install and configure TanStack Router
   - Install and configure TanStack Query
   - Set up shadcn/ui with Tailwind CSS
   - Configure path aliases

3. **Set up backend API (`apps/api`)**
   - Initialize Cloudflare Worker project with Wrangler
   - Install Hono framework
   - Install and configure tRPC
   - Install and configure Drizzle ORM
   - Set up D1 database binding

4. **Set up shared package (`packages/shared`)**
   - Create Zod schemas for shared validation
   - Define shared TypeScript types
   - Configure build and exports

5. **Configure development workflow**
   - Set up concurrent dev servers
   - Configure environment variables
   - Set up ESLint and Prettier
   - Configure VS Code settings

#### Deliverables:
- [ ] Working monorepo with all packages
- [ ] Frontend dev server running
- [ ] Worker dev server running with D1
- [ ] Basic "Hello World" tRPC endpoint connected

---

### Phase 2: Database Schema & API Foundation

**Goal:** Design and implement the database schema and core API endpoints.

#### Tasks:

1. **Design Drizzle schema**
   ```typescript
   // users table
   // games table
   // sessions table
   ```

2. **Create D1 migrations**
   - Initial schema migration
   - Set up migration workflow

3. **Implement tRPC routers**
   - `gameRouter`: CRUD operations for games
   - `sessionRouter`: CRUD operations for sessions
   - `statsRouter`: Aggregation queries

4. **Set up tRPC client on frontend**
   - Configure tRPC + TanStack Query integration
   - Set up type inference from backend

5. **Implement basic auth (simplified for v1)**
   - For MVP: Simple user ID in localStorage
   - Future: Full auth with sessions/JWT

#### API Endpoints:

```typescript
// Games
games.list        // Get all games for user
games.get         // Get single game by ID
games.create      // Create new game
games.update      // Update game
games.delete      // Delete game

// Sessions
sessions.list     // Get sessions (with pagination, filters)
sessions.get      // Get single session
sessions.create   // Create/start session
sessions.update   // Update session (end time, notes)
sessions.delete   // Delete session
sessions.active   // Get currently active session

// Stats
stats.overview    // Dashboard stats
stats.byGame      // Time per game
stats.byPlatform  // Time per platform
stats.timeline    // Daily/weekly/monthly trends
```

#### Deliverables:
- [ ] Database schema implemented and migrated
- [ ] All CRUD endpoints working
- [ ] Stats endpoints returning real data
- [ ] Frontend can fetch data via tRPC

---

### Phase 3: Core UI Components

**Goal:** Build the foundational UI components using shadcn/ui.

#### Tasks:

1. **Set up shadcn/ui components**
   - Button, Input, Card, Dialog, etc.
   - Data Table with sorting/filtering
   - Form components with react-hook-form

2. **Build custom components**
   - `GameCard` - Display game with cover art
   - `SessionTimer` - Live timer display
   - `StatCard` - Dashboard stat display
   - `TimeDisplay` - Format duration nicely
   - `PlatformBadge` - Platform indicator
   - `StatusBadge` - Game status indicator

3. **Create layout components**
   - `AppShell` - Main layout with nav
   - `PageHeader` - Consistent page headers
   - `EmptyState` - When no data exists

4. **Implement dark mode**
   - Configure Tailwind dark mode
   - Theme toggle component
   - Persist preference

#### Deliverables:
- [ ] All shadcn components installed
- [ ] Custom components built and documented
- [ ] Consistent design system
- [ ] Dark/light mode working

---

### Phase 4: Feature - Game Library

**Goal:** Implement full game library management.

#### Tasks:

1. **Games list page (`/games`)**
   - Grid view of games with covers
   - Search by title
   - Filter by platform and status
   - Empty state for new users

2. **Add game dialog/form**
   - Form with validation
   - Platform selector
   - Status selector
   - Optional fields (cover URL, genre, notes)

3. **Game detail page (`/games/:id`)**
   - Display game info
   - Edit game button
   - Delete game (with confirmation)
   - Total time played for this game
   - List of sessions for this game

4. **Edit game dialog/form**
   - Pre-populated form
   - Save/cancel actions

#### Deliverables:
- [ ] Can add games to library
- [ ] Can view all games
- [ ] Can edit game details
- [ ] Can delete games
- [ ] Search and filter working

---

### Phase 5: Feature - Session Tracking

**Goal:** Implement session logging with live timer.

#### Tasks:

1. **Active session state management**
   - Store active session in React state
   - Persist active session to localStorage (recovery)
   - Sync with server

2. **Start session flow**
   - "Start Session" button on game card/detail
   - Creates session with current timestamp
   - Shows active timer in header/dashboard

3. **Live timer component**
   - Real-time updating display
   - Visible globally when session active
   - Quick stop button

4. **Stop session flow**
   - End session, set endTime
   - Prompt for optional notes
   - Show session summary

5. **Manual session entry**
   - Form to add past sessions
   - Date/time pickers for start/end
   - Game selector

6. **Sessions list page (`/sessions`)**
   - Paginated list of sessions
   - Filter by game, date range
   - Edit/delete actions

#### Deliverables:
- [ ] Can start/stop live sessions
- [ ] Timer displays correctly
- [ ] Can add manual sessions
- [ ] Can view/edit/delete sessions

---

### Phase 6: Feature - Dashboard & Statistics

**Goal:** Build the dashboard and statistics views.

#### Tasks:

1. **Dashboard page (`/`)**
   - Welcome message
   - Quick stat cards:
     - Total time (all time)
     - This week's time
     - Games in library
     - Current streak
   - Active session indicator
   - Recent sessions list (5-10)
   - Quick actions

2. **Statistics page (`/stats`)**
   - Install Recharts
   - Time by game (bar chart)
   - Time by platform (pie chart)
   - Daily/weekly trend (line chart)
   - Date range selector

3. **Game detail stats**
   - Time played for specific game
   - Session history chart

#### Deliverables:
- [ ] Dashboard with real stats
- [ ] Interactive charts
- [ ] Date range filtering

---

### Phase 7: Polish & Production Readiness

**Goal:** Prepare for production deployment.

#### Tasks:

1. **Error handling**
   - Global error boundary
   - API error handling
   - User-friendly error messages
   - Retry logic for failed requests

2. **Loading states**
   - Skeleton loaders
   - Optimistic updates
   - Suspense boundaries

3. **Performance optimization**
   - Code splitting by route
   - Image optimization
   - Query caching strategy
   - Bundle analysis

4. **Testing**
   - Unit tests for utilities
   - Integration tests for API
   - E2E tests for critical flows

5. **Production configuration**
   - Environment variables
   - Production D1 database
   - Custom domain setup
   - Analytics (optional)

6. **Documentation**
   - README with setup instructions
   - API documentation
   - Contributing guide

#### Deliverables:
- [ ] No console errors
- [ ] Fast load times
- [ ] Test coverage
- [ ] Production deployment working

---

## Database Schema (Drizzle)

```typescript
// packages/shared/src/db/schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  platform: text('platform', {
    enum: ['pc', 'playstation', 'xbox', 'nintendo', 'mobile', 'other']
  }).notNull(),
  status: text('status', {
    enum: ['playing', 'completed', 'backlog', 'dropped', 'wishlist']
  }).notNull().default('backlog'),
  coverUrl: text('cover_url'),
  genre: text('genre'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => games.id),
  userId: text('user_id').notNull().references(() => users.id),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

---

## Key Technical Decisions

### 1. Monorepo Structure
Using pnpm workspaces for simplicity. Can upgrade to Turborepo if needed for caching.

### 2. tRPC + Hono on Workers
Hono provides excellent Cloudflare Workers support. tRPC adapter for Hono enables type-safe APIs.

### 3. D1 + Drizzle
Drizzle has first-class D1 support and generates clean migrations. SQLite syntax is straightforward.

### 4. TanStack Router
File-based routing with full type safety. Better DX than React Router for type inference.

### 5. shadcn/ui
Copy-paste components mean full control. Built on Radix primitives for accessibility.

### 6. Authentication Strategy
For MVP, use a simple UUID stored in localStorage. This allows immediate use without auth complexity. Can add proper auth (Cloudflare Access, Auth0, or custom) in v2.

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start all dev servers
pnpm dev

# Start individual apps
pnpm --filter web dev
pnpm --filter api dev

# Database migrations
pnpm --filter api db:generate  # Generate migration
pnpm --filter api db:migrate   # Run migration

# Build for production
pnpm build

# Deploy
pnpm --filter api deploy       # Deploy worker
pnpm --filter web deploy       # Deploy to Pages

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

---

## Milestones & Checkpoints

| Milestone | Description | Validation |
|-----------|-------------|------------|
| M1 | Project setup complete | Both apps running, tRPC connected |
| M2 | Database ready | Can CRUD games and sessions via API |
| M3 | Game library working | Can manage games in UI |
| M4 | Session tracking working | Can start/stop sessions with timer |
| M5 | Dashboard complete | Stats display correctly |
| M6 | Production ready | Deployed and accessible |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| D1 limitations (SQLite) | Design schema with D1 limits in mind; avoid complex joins |
| Worker cold starts | Minimize bundle size; use lightweight dependencies |
| tRPC + Workers complexity | Use hono-trpc adapter; follow official examples |
| Auth complexity | Defer to v2; use simple UUID for MVP |
| Time zone issues | Store all times as UTC; convert on client |

---

## Getting Started

Begin with Phase 1 tasks. The recommended order:

1. Initialize the monorepo structure
2. Set up the web app with Vite + React
3. Set up the API worker with Hono
4. Connect them with tRPC
5. Add D1 database
6. Proceed to Phase 2

Each phase builds on the previous. Complete all deliverables before moving to the next phase.
