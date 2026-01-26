# VG-Log: Family Gaming Time Tracker

## Product Requirements Document (PRD)

### Overview

VG-Log is a trust-based family tool for tracking kids' video game screen time. Kids log their own gaming sessions while parents and kids share visibility into weekly summaries, calendars, and graphs. Parents can set time limits, and the app warns kids when they're approaching or exceeding those limits.

### Problem Statement

Parents and kids often disagree about how much gaming time is "enough." Without shared visibility, these conversations become contentious. Kids feel policed; parents feel ignored.

VG-Log creates a **shared source of truth** where:
- Kids take ownership by logging their own time
- Everyone sees the same data
- Limits are clear and visible upfront
- The app (not the parent) delivers warnings
- Trust is built through transparency

### Target Users

1. **Kids (ages 8-16)** - Primary users who log their gaming sessions
2. **Parents** - Set limits, review data, share accountability

### Core Philosophy

- **Trust-based**: Kids self-report; no surveillance or enforcement
- **Shared visibility**: Same data for everyone, no secrets
- **Kid-friendly**: Simple to use, not punitive
- **Limit awareness**: Know your budget before you play
- **Informational, not restrictive**: The app warns but never blocks

### Key Design Decisions

1. **No enforcement**: The app cannot actually prevent gaming, so it won't try. Kids can always log time, even past their limit. The value is in awareness and shared data, not control.

2. **Parent notifications**: Parents are notified when a child exceeds their limit (via browser notification if app is open, or other available web mechanisms).

3. **Over-limit behavior**: When a kid is over their limit:
   - Timer turns red and shows negative remaining time
   - Parent is notified
   - Kid can still start/stop sessions normally
   - Data is still tracked accurately

---

## Core Features

### 1. Session Logging (Kid-focused)

**Description:** Kids log when they start and stop playing games.

**Requirements:**
- Big, obvious "Start Playing" button
- Live timer showing current session duration
- "Stop Playing" button ends session
- Optional: Add a note about what they played
- Show remaining time budget while playing
- Manual entry for forgotten sessions (with parent visibility)

**User Flow:**
```
Kid opens app → Sees "You have 2h 30m left this week"
→ Taps "Start Playing" → Timer begins
→ Sees live countdown of remaining time
→ Gets warning at 15 min remaining
→ Gets alarm when time is up
→ Taps "Stop Playing" → Session saved
```

### 2. Time Limits (Parent-configured)

**Description:** Parents set gaming time budgets for different periods.

**Requirements:**
- Set limits per day, week, and/or month
- Different limits for weekdays vs weekends (optional)
- Limits are visible to kids at all times
- Easy to adjust limits over time
- Optional: Bonus time grants

**Limit Types:**
```
- Daily limit: e.g., 1 hour per day
- Weekend daily limit: e.g., 2 hours per day
- Weekly limit: e.g., 7 hours per week
- Monthly limit: e.g., 30 hours per month (optional)
```

**Data Model - Limits:**
```
- id: UUID
- familyId: UUID
- childId: UUID
- limitType: enum (daily, weekend_daily, weekly, monthly)
- minutes: integer
- effectiveFrom: date
- createdBy: UUID (parent)
- createdAt: timestamp
```

### 3. Warnings & Alarms

**Description:** Proactive alerts when kids approach or reach limits.

**Requirements:**
- Warning when X minutes remaining (configurable, default 15 min)
- Urgent warning when 5 minutes remaining
- Alarm/notification when limit reached
- Visual indicator changes (green → yellow → red)
- Audio alert option
- Cannot be dismissed without acknowledgment

**Alert States:**
```
🟢 Plenty of time (> 30 min remaining)
🟡 Getting close (15-30 min remaining)
🟠 Warning (5-15 min remaining)
🔴 Time's up (0 min remaining)
⚫ Over limit (negative time) - still trackable, parent notified
```

### 4. Parent Notifications

**Description:** Parents are alerted when kids exceed limits.

**Requirements:**
- Notify when a child goes over their weekly limit
- Browser notification (if parent has app open)
- Visual indicator on parent dashboard ("Over limit!")
- Optional: Email notification (v2)

**Limitations (Web App):**
- Browser notifications require the app to be open or a service worker
- No native push notifications without PWA install
- Email would require additional infrastructure

### 5. Dashboard (Shared View)

**Description:** At-a-glance view of current status and recent activity.

**For Kids - Shows:**
- Time remaining today/this week
- Current session timer (if active)
- Visual progress bar of time used
- Quick history of recent sessions

**For Parents - Shows:**
- Each child's status
- Time used vs limits
- Any manual entries to review
- Quick limit adjustment

### 6. Weekly Summary

**Description:** End-of-week report for family discussion.

**Requirements:**
- Total time played this week
- Comparison to limit
- Comparison to previous weeks
- Day-by-day breakdown
- Trend indicator (up/down/same)
- Shareable/printable

### 7. Calendar View

**Description:** Visual calendar showing gaming sessions.

**Requirements:**
- Monthly calendar view
- Days colored by usage (none/light/medium/heavy)
- Tap day to see sessions
- Shows streaks and patterns
- Both parent and kid can view

### 8. Graphs & Statistics

**Description:** Visual representation of gaming habits over time.

**Charts:**
- Weekly bar chart (last 4-8 weeks)
- Daily pattern chart (which days of week)
- Time of day pattern (when do they play)
- Trend line over time

### 9. Family Setup

**Description:** Connect parents and kids in a family group.

**Requirements:**
- Parent creates family with invite code
- Kids join with code
- Multiple kids per family
- Multiple parents per family
- Parent vs kid roles with different permissions

**Data Model - Family:**
```
- id: UUID
- name: string (e.g., "Smith Family")
- inviteCode: string (6 chars)
- createdAt: timestamp

User:
- id: UUID
- familyId: UUID
- name: string
- role: enum (parent, child)
- email: string (optional, mainly for parents)
- pin: string (simple 4-digit for kids)
- createdAt: timestamp
```

**Data Model - Session:**
```
- id: UUID
- oderId: UUID
- familyId: UUID
- startTime: timestamp
- endTime: timestamp (nullable if active)
- notes: text (optional)
- isManual: boolean (true if added after the fact)
- createdAt: timestamp
```

---

## User Roles & Permissions

| Action | Kid | Parent |
|--------|-----|--------|
| Start/stop session | ✅ | ❌ |
| Add manual session | ✅ | ✅ |
| View own data | ✅ | ✅ |
| View child's data | - | ✅ |
| Set limits | ❌ | ✅ |
| Grant bonus time | ❌ | ✅ |
| Adjust settings | ❌ | ✅ |
| View family summary | ✅ | ✅ |

---

## User Experience

### Kid Experience

**Primary Goal:** Make it easy and non-punitive to log time.

1. **Opening the app:**
   - Immediately see: "You have X time left today"
   - Big friendly button to start
   - No login friction (PIN or remembered device)

2. **While playing:**
   - Can check remaining time anytime
   - Gentle warnings, not aggressive
   - Timer visible but not anxiety-inducing

3. **Ending session:**
   - Simple one-tap stop
   - Optional note ("Played Minecraft with friends")
   - Positive reinforcement ("Great job logging!")

4. **Reviewing data:**
   - See their own calendar and graphs
   - Feel ownership, not surveillance

### Parent Experience

**Primary Goal:** Set it and forget it, with easy visibility.

1. **Setup:**
   - Create family, add kids
   - Set reasonable limits
   - Share code with kids

2. **Day-to-day:**
   - Glance at dashboard occasionally
   - See if kids are logging
   - Review any manual entries

3. **Weekly:**
   - Review weekly summary together as family
   - Discuss and adjust limits if needed
   - Use data for constructive conversations

---

## Pages & Navigation

### Shared Pages
- `/` - Dashboard (role-aware)
- `/calendar` - Calendar view
- `/stats` - Graphs and statistics
- `/summary` - Weekly summary

### Kid-specific
- `/play` - Start/stop session with timer

### Parent-specific
- `/limits` - Configure time limits
- `/family` - Manage family members
- `/settings` - App settings

---

## Technical Requirements

### Real-time Updates
- Timer must update every second
- Warnings must trigger on time
- Multiple devices should sync

### Offline Support
- Sessions should work offline
- Sync when back online
- Local notifications for alarms

### Notifications
- Browser notifications for warnings
- Optional sound alerts
- Mobile-friendly (PWA)

---

## Non-Functional Requirements

### Performance
- Instant timer start/stop
- Dashboard loads < 1 second
- Works on kid's older devices

### Security
- Family data isolated
- Simple auth (no passwords for kids)
- Parent controls protected

### Accessibility
- Large touch targets
- Clear visual hierarchy
- Readable by younger kids

---

## MVP Scope (v1)

**Include:**
- [ ] Family setup with invite codes
- [ ] Kid session logging (start/stop)
- [ ] Live timer with remaining time
- [ ] Basic warnings (visual + optional sound)
- [ ] Weekly limits
- [ ] Dashboard for both roles
- [ ] Simple calendar view
- [ ] Basic weekly summary

**Defer to v2:**
- [ ] Daily/weekend/monthly limits
- [ ] Push notifications
- [ ] Offline support
- [ ] Detailed graphs
- [ ] Multiple children support
- [ ] Bonus time grants
- [ ] Session notes
- [ ] Manual session entry

---

## Success Metrics

- Kids logging sessions consistently (daily active)
- Sessions ended (not abandoned)
- Families reviewing weekly summaries
- Limit compliance (staying within limits)
- Continued usage over 4+ weeks

---

## Resolved Decisions

| Question | Decision |
|----------|----------|
| Enforcement vs informational? | **Informational only** - app warns but never blocks |
| Parent notifications? | **Yes** - via browser notifications when limit exceeded |
| Streaks for staying under limit? | **Deferred to v2** |
| Bank/rollover unused time? | **Deferred to v2** |

## Open Questions

1. Should the app work on game consoles or just phones/tablets/computers?
2. What's the best fallback when browser notifications aren't available?
3. Should there be a "grace period" after hitting the limit before notifying parents?
