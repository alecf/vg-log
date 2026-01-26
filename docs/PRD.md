# VG-Log: Video Game Time Tracker

## Product Requirements Document (PRD)

### Overview

VG-Log is a web-based application for tracking time spent playing video games. Users can log gaming sessions, manage their game library, and view statistics about their gaming habits.

### Problem Statement

Gamers often want to understand how much time they spend playing games, track their gaming habits over time, and maintain a personal gaming library. While platforms like Steam track playtime, there's no unified solution for tracking across all platforms (PC, console, mobile, retro) or for games that don't have built-in tracking.

### Target Users

- Casual gamers who want to track their hobby time
- Parents tracking children's gaming time
- Content creators tracking time for reviews/streams
- Anyone wanting to maintain a personal gaming log/journal

---

## Core Features

### 1. Game Library Management

**Description:** Users can add games to their personal library with metadata.

**Requirements:**
- Add games manually with title, platform, cover art URL, genre, and notes
- Edit and delete games from library
- Search and filter games by title, platform, genre
- Mark games as: Playing, Completed, Backlog, Dropped, Wishlist

**Data Model - Game:**
```
- id: UUID
- userId: string
- title: string
- platform: enum (PC, PlayStation, Xbox, Nintendo, Mobile, Other)
- coverUrl: string (optional)
- genre: string (optional)
- status: enum (playing, completed, backlog, dropped, wishlist)
- notes: text (optional)
- createdAt: timestamp
- updatedAt: timestamp
```

### 2. Session Tracking

**Description:** Users can log gaming sessions with start/end times.

**Requirements:**
- Start a new session for a game (live timer)
- End an active session
- Manually add past sessions with custom start/end times
- Edit and delete sessions
- Add notes to sessions (e.g., "Beat the final boss!")

**Data Model - Session:**
```
- id: UUID
- gameId: UUID (foreign key)
- userId: string
- startTime: timestamp
- endTime: timestamp (nullable for active sessions)
- notes: text (optional)
- createdAt: timestamp
- updatedAt: timestamp
```

### 3. Dashboard & Statistics

**Description:** Users can view aggregated statistics about their gaming habits.

**Requirements:**
- Total time played (all time, this week, this month)
- Time per game (with sorting)
- Time per platform breakdown
- Recent sessions list
- Currently active session indicator
- Streak tracking (consecutive days played)
- Charts: daily/weekly/monthly playtime trends

### 4. User Authentication

**Description:** Users can create accounts to persist their data.

**Requirements:**
- Sign up / Sign in (email/password or OAuth)
- Session management
- Data isolation per user
- Optional: Guest mode with local storage

---

## Non-Functional Requirements

### Performance
- Initial page load < 2 seconds
- API responses < 200ms
- Support for 1000+ games per user
- Support for 10,000+ sessions per user

### Security
- Secure authentication with hashed passwords
- HTTPS only
- Input validation and sanitization
- Rate limiting on API endpoints

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast compliance

### Reliability
- 99.9% uptime target
- Graceful error handling
- Data backup strategy

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI library |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **TanStack Router** | File-based routing with type safety |
| **TanStack Query** | Server state management |
| **tRPC Client** | Type-safe API client |
| **shadcn/ui** | UI component library |
| **Tailwind CSS** | Utility-first CSS |
| **Recharts** | Charts and visualizations |
| **date-fns** | Date manipulation |

### Backend
| Technology | Purpose |
|------------|---------|
| **Cloudflare Workers** | Serverless compute |
| **Cloudflare D1** | SQLite database |
| **tRPC** | Type-safe API layer |
| **Drizzle ORM** | Database ORM with migrations |
| **Hono** | Web framework for Workers |
| **Zod** | Schema validation |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Cloudflare Pages** | Frontend hosting |
| **Cloudflare Workers** | API hosting |
| **Cloudflare D1** | Database |
| **Wrangler** | Cloudflare CLI |

---

## User Stories

### Epic 1: Game Library
- [ ] As a user, I can add a new game to my library
- [ ] As a user, I can view all games in my library
- [ ] As a user, I can edit game details
- [ ] As a user, I can delete a game from my library
- [ ] As a user, I can filter games by platform or status
- [ ] As a user, I can search games by title

### Epic 2: Session Tracking
- [ ] As a user, I can start a live gaming session
- [ ] As a user, I can see an active timer while playing
- [ ] As a user, I can stop an active session
- [ ] As a user, I can manually log a past session
- [ ] As a user, I can edit session times and notes
- [ ] As a user, I can delete a session

### Epic 3: Statistics & Dashboard
- [ ] As a user, I can see my total gaming time
- [ ] As a user, I can see time played per game
- [ ] As a user, I can see a breakdown by platform
- [ ] As a user, I can see recent sessions
- [ ] As a user, I can see playtime trends over time

### Epic 4: Authentication
- [ ] As a user, I can create an account
- [ ] As a user, I can log in to my account
- [ ] As a user, I can log out
- [ ] As a user, I can reset my password

---

## UI/UX Design

### Pages

1. **Dashboard** (`/`)
   - Quick stats cards
   - Active session indicator
   - Recent sessions
   - Quick actions (start session, add game)

2. **Games Library** (`/games`)
   - Grid/list view of games
   - Search and filter bar
   - Add game button

3. **Game Detail** (`/games/:id`)
   - Game info and cover art
   - Total time played
   - Session history for this game
   - Start session button

4. **Sessions** (`/sessions`)
   - Paginated list of all sessions
   - Filter by game, date range
   - Manual session entry

5. **Statistics** (`/stats`)
   - Charts and graphs
   - Time breakdowns
   - Trends over time

6. **Settings** (`/settings`)
   - Profile management
   - Preferences
   - Data export

### Design Principles
- Clean, modern interface
- Dark mode by default (gamers prefer dark themes)
- Responsive design (mobile-first)
- Minimal clicks for common actions
- Visual feedback for all interactions

---

## Future Enhancements (v2+)

- Game database integration (IGDB/RAWG API) for auto-complete
- Import from Steam, PlayStation, Xbox APIs
- Social features (friends, leaderboards)
- Goals and achievements
- Multiple lists/collections
- Review and rating system
- Mobile app (React Native)
- Browser extension for auto-tracking
- Discord integration
- Export to CSV/JSON

---

## Success Metrics

- User retention (7-day, 30-day)
- Sessions logged per user per week
- Time to first session logged
- Feature adoption rates
- Page load performance
- Error rates

---

## Open Questions

1. Should we support multiple users per account (family tracking)?
2. What OAuth providers to support initially?
3. Should we integrate with game databases for easier game entry?
4. Privacy: Should session data be shareable/public?
