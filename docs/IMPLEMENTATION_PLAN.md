# VG-Log: Implementation Plan

## Project Structure

```
vg-log/
├── apps/
│   ├── web/                    # React frontend (PWA)
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   │   ├── ui/         # shadcn components
│   │   │   │   ├── timer/      # Timer-related components
│   │   │   │   └── charts/     # Visualization components
│   │   │   ├── routes/         # TanStack Router pages
│   │   │   ├── lib/            # Utilities, tRPC client
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── stores/         # Zustand stores (timer state)
│   │   │   └── styles/         # Global styles
│   │   ├── public/
│   │   │   └── sounds/         # Alert sounds
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                    # Cloudflare Worker API
│       ├── src/
│       │   ├── routers/        # tRPC routers
│       │   ├── db/             # Drizzle schema & migrations
│       │   ├── lib/            # Utilities
│       │   └── index.ts        # Worker entry point
│       ├── drizzle/            # Migration files
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
└── tsconfig.json               # Base TypeScript config
```

---

## Database Schema

```typescript
// apps/api/src/db/schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Family group
export const families = sqliteTable('families', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  timezone: text('timezone').notNull().default('America/Los_Angeles'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Users (parents and kids)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  role: text('role', { enum: ['parent', 'child'] }).notNull(),
  pin: text('pin'), // 4-digit PIN for kids
  email: text('email'), // Optional, mainly for parents
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Gaming sessions
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  familyId: text('family_id').notNull().references(() => families.id),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }), // null = active
  notes: text('notes'),
  isManual: integer('is_manual', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Time limits set by parents
export const limits = sqliteTable('limits', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id),
  userId: text('user_id').notNull().references(() => users.id), // which child
  limitType: text('limit_type', {
    enum: ['daily', 'weekend_daily', 'weekly', 'monthly']
  }).notNull(),
  minutes: integer('minutes').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  effectiveFrom: integer('effective_from', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Alert settings
export const alertSettings = sqliteTable('alert_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  warningMinutes: integer('warning_minutes').notNull().default(15),
  urgentMinutes: integer('urgent_minutes').notNull().default(5),
  soundEnabled: integer('sound_enabled', { mode: 'boolean' }).notNull().default(true),
});
```

---

## Implementation Phases

### Phase 1: Project Scaffolding

**Goal:** Set up monorepo, dev environment, and basic infrastructure.

#### Tasks:

1. **Initialize monorepo**
   - Create `pnpm-workspace.yaml`
   - Configure root `package.json` with scripts
   - Set up shared TypeScript config

2. **Set up frontend (`apps/web`)**
   - Vite + React + TypeScript
   - TanStack Router (file-based routing)
   - TanStack Query
   - shadcn/ui + Tailwind CSS
   - Configure PWA manifest

3. **Set up backend (`apps/api`)**
   - Cloudflare Worker with Hono
   - tRPC integration
   - D1 database binding
   - Drizzle ORM setup

4. **Set up shared package**
   - Zod schemas for validation
   - Shared TypeScript types

5. **Verify connectivity**
   - tRPC client calling API
   - Basic health check endpoint

#### Deliverables:
- [ ] `pnpm dev` runs both apps
- [ ] Frontend can call backend via tRPC
- [ ] D1 database connected

---

### Phase 2: Database & Core API

**Goal:** Implement database schema and essential API endpoints.

#### Tasks:

1. **Create Drizzle schema**
   - families, users, sessions, limits tables
   - Run initial migration

2. **Implement tRPC routers**

   ```typescript
   // familyRouter
   family.create      // Create family (returns invite code)
   family.join        // Join family with invite code
   family.get         // Get family details
   family.members     // List family members

   // authRouter
   auth.login         // Login with PIN or email
   auth.logout        // Clear session
   auth.me            // Get current user

   // sessionRouter
   session.start      // Start new session
   session.stop       // End active session
   session.active     // Get current active session
   session.list       // List sessions (with filters)
   session.manual     // Add manual session

   // limitRouter
   limit.set          // Set/update limit for a child
   limit.get          // Get limits for a child
   limit.remaining    // Calculate remaining time

   // statsRouter
   stats.weekly       // Weekly summary data
   stats.calendar     // Calendar view data
   stats.trends       // Trend data for graphs
   ```

3. **Implement remaining time calculation**
   - Sum sessions in current period
   - Subtract from limit
   - Handle timezone correctly

#### Deliverables:
- [ ] All tables created in D1
- [ ] CRUD operations working
- [ ] Remaining time calculation accurate

---

### Phase 3: Authentication & Family Setup

**Goal:** Implement simple auth and family management.

#### Tasks:

1. **Family creation flow**
   - Parent enters name, creates family
   - Generate unique 6-char invite code
   - Store parent as first member

2. **Family join flow**
   - Enter invite code
   - Enter name and role (kid)
   - Set 4-digit PIN

3. **Login flow**
   - Kids: Select name + enter PIN
   - Parents: Email or PIN option
   - Store session in cookie/localStorage

4. **Session management**
   - Persist login across refreshes
   - Auto-login on same device
   - Logout functionality

#### UI Pages:
- `/onboarding` - First-time setup wizard
- `/login` - Family member selection + PIN
- `/family` - Manage members (parent only)

#### Deliverables:
- [ ] Can create family and get invite code
- [ ] Can join family with code
- [ ] Login/logout working
- [ ] Session persists

---

### Phase 4: Timer & Session Tracking (Core Feature)

**Goal:** Implement the main kid experience - starting/stopping sessions.

#### Tasks:

1. **Timer state management (Zustand)**
   ```typescript
   interface TimerStore {
     activeSession: Session | null;
     elapsedSeconds: number;
     remainingSeconds: number;
     alertState: 'ok' | 'warning' | 'urgent' | 'exceeded';
     startSession: () => Promise<void>;
     stopSession: () => Promise<void>;
     tick: () => void;
   }
   ```

2. **Timer component**
   - Large, readable display
   - Color changes based on remaining time
   - Elapsed time + remaining time

3. **Start/Stop session flow**
   - "Start Playing" → Creates session, starts timer
   - "Stop Playing" → Ends session, shows summary
   - Persist to server immediately

4. **Alert system**
   - Visual color changes (green→yellow→orange→red)
   - Optional sound alerts
   - Browser notification at thresholds
   - Cannot be dismissed easily

5. **Recovery handling**
   - Check for active session on app load
   - Resume timer if session exists
   - Handle abandoned sessions

#### UI Pages:
- `/play` - Main timer screen for kids

#### Deliverables:
- [ ] Timer starts/stops correctly
- [ ] Time syncs with server
- [ ] Alerts trigger at thresholds
- [ ] Session survives page refresh

---

### Phase 5: Dashboard & Remaining Time

**Goal:** Build role-aware dashboard showing key information.

#### Tasks:

1. **Kid dashboard**
   - Remaining time (prominent display)
   - Progress bar (used vs limit)
   - Quick "Start Playing" button
   - Recent sessions list
   - Current streak/status

2. **Parent dashboard**
   - Overview of each child
   - Time used this week per child
   - Quick limit adjustment
   - Flag any manual entries

3. **Remaining time widget**
   - Reusable component
   - Updates in real-time when session active
   - Shows daily AND weekly remaining

4. **Recent sessions list**
   - Last 5-10 sessions
   - Duration, date, time
   - Manual entry indicator

#### UI Pages:
- `/` - Dashboard (role-aware)

#### Deliverables:
- [ ] Kid sees remaining time immediately
- [ ] Parent sees all children's status
- [ ] Data updates in real-time

---

### Phase 6: Limits Configuration

**Goal:** Parents can set and adjust time limits.

#### Tasks:

1. **Limits management UI**
   - Select child
   - Set weekly limit (MVP)
   - Save and apply immediately

2. **Limit display for kids**
   - Show current limits on dashboard
   - "Your limit: 7 hours/week"

3. **Limit history** (optional)
   - Track when limits changed
   - Show effective date

#### UI Pages:
- `/limits` - Limit configuration (parent only)

#### Deliverables:
- [ ] Parents can set weekly limits
- [ ] Limits apply immediately
- [ ] Kids can see their limits

---

### Phase 7: Calendar View

**Goal:** Visual calendar showing gaming patterns.

#### Tasks:

1. **Monthly calendar component**
   - Show current month
   - Navigate between months
   - Heat map coloring by usage

2. **Day detail**
   - Tap day to see sessions
   - Show total time that day
   - List individual sessions

3. **Color coding**
   - No gaming: gray/empty
   - Light: pale green
   - Medium: yellow
   - Heavy/over limit: red

#### UI Pages:
- `/calendar` - Calendar view

#### Deliverables:
- [ ] Calendar displays correctly
- [ ] Days are color-coded
- [ ] Can drill into day details

---

### Phase 8: Weekly Summary

**Goal:** Shareable weekly report for family discussions.

#### Tasks:

1. **Weekly summary page**
   - Total time this week
   - Limit and actual comparison
   - Day-by-day breakdown (mini bar chart)
   - Comparison to last week
   - Sessions list

2. **Summary generation**
   - Auto-calculate at week end (Sunday/Monday configurable)
   - Show trend (up/down/same)

3. **Share functionality** (optional)
   - Print-friendly view
   - Copy summary text

#### UI Pages:
- `/summary` - Weekly summary

#### Deliverables:
- [ ] Weekly summary shows accurate data
- [ ] Week-over-week comparison
- [ ] Printable/shareable

---

### Phase 9: Polish & Production

**Goal:** Production-ready application.

#### Tasks:

1. **Error handling**
   - Global error boundary
   - Friendly error messages
   - Retry logic for API calls

2. **Loading states**
   - Skeleton loaders
   - Optimistic updates for timer

3. **PWA setup**
   - Service worker
   - Add to home screen
   - Offline indicator

4. **Sound alerts**
   - Warning sound files
   - Audio playback on threshold
   - Respect sound settings

5. **Performance**
   - Code splitting
   - Bundle optimization
   - Lazy loading routes

6. **Deployment**
   - Production D1 database
   - Cloudflare Pages deployment
   - Custom domain

#### Deliverables:
- [ ] No console errors
- [ ] Works as PWA
- [ ] Deployed to production
- [ ] Custom domain configured

---

## Key Components

### Timer Display
```tsx
<TimerDisplay
  elapsed={3600}          // seconds played
  remaining={5400}        // seconds remaining
  alertState="warning"    // ok | warning | urgent | exceeded
  onStop={() => {}}
/>
```

### Time Remaining Widget
```tsx
<TimeRemaining
  remaining={5400}        // seconds
  limit={25200}           // weekly limit in seconds
  period="week"
/>
// Displays: "2h 30m left this week"
```

### Progress Bar
```tsx
<TimeProgressBar
  used={18000}            // 5 hours
  limit={25200}           // 7 hours
  showLabels
/>
// Visual bar: [=========>          ] 71%
```

### Alert Banner
```tsx
<AlertBanner
  state="urgent"
  remaining={300}         // 5 minutes
  onDismiss={() => {}}    // requires acknowledgment
/>
```

---

## API Response Types

```typescript
// Remaining time response
interface RemainingTime {
  daily: {
    used: number;         // minutes
    limit: number | null;
    remaining: number;
  };
  weekly: {
    used: number;
    limit: number;
    remaining: number;
  };
  activeSession: {
    id: string;
    startTime: Date;
    elapsedMinutes: number;
  } | null;
}

// Weekly summary response
interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  totalMinutes: number;
  limitMinutes: number;
  sessions: Session[];
  dailyBreakdown: {
    date: Date;
    minutes: number;
  }[];
  comparison: {
    lastWeek: number;
    change: number;        // percentage
    trend: 'up' | 'down' | 'same';
  };
}
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start dev servers (both apps)
pnpm dev

# Start individual apps
pnpm --filter web dev
pnpm --filter api dev

# Database
pnpm --filter api db:generate   # Generate migration
pnpm --filter api db:migrate    # Run local migration
pnpm --filter api db:studio     # Open Drizzle Studio

# Build
pnpm build

# Deploy
pnpm --filter api deploy        # Deploy worker
pnpm --filter web deploy        # Deploy to Pages

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

## Timeline-Free Milestones

| Milestone | Validation Criteria |
|-----------|---------------------|
| **M1: Setup** | Both apps running, tRPC connected, D1 working |
| **M2: Auth** | Can create family, join with code, login/logout |
| **M3: Timer** | Can start/stop sessions, timer works, alerts fire |
| **M4: Dashboard** | See remaining time, recent sessions, basic stats |
| **M5: Limits** | Parents can set limits, kids see remaining |
| **M6: Calendar** | Calendar shows sessions with color coding |
| **M7: Summary** | Weekly summary generates correctly |
| **M8: Production** | Deployed, working on custom domain |

---

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Weekly limits first** | Simplest mental model; daily limits add complexity |
| **PIN auth for kids** | No email needed, easy to remember, quick login |
| **Zustand for timer** | Local state that needs to persist and update frequently |
| **Server-side session storage** | Timer state survives device switches |
| **Browser notifications** | Works without native app; PWA-friendly |
| **SQLite timestamps as integers** | D1/SQLite best practice for dates |

---

## Getting Started

1. Clone repo and install: `pnpm install`
2. Set up local D1: `pnpm --filter api db:migrate`
3. Start dev servers: `pnpm dev`
4. Open http://localhost:5173

Begin with Phase 1, validating each deliverable before proceeding.
