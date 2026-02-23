

# Phase 1 Implementation Plan -- College Skill Progress Tracker MVP

This plan covers setting up Supabase, authentication, database schema, seed data, and the core UI for skill tracking with levels and recommendations.

---

## Step 1: Connect Supabase

Connect the project to Supabase to enable authentication and database features.

---

## Step 2: Database Schema (Migration)

Create all Phase 1 tables in a single migration:

**Tables:**
- `profiles` -- id (uuid PK, FK to auth.users ON DELETE CASCADE), display_name, avatar_url, role (text, 'junior' or 'senior'), bio, year (int), college (text), created_at
- `skill_tracks` -- id (uuid PK), name, description, icon (text), is_default (bool), created_at
- `skills` -- id (uuid PK), track_id (FK to skill_tracks), name, description, order (int), difficulty_level (text), created_at
- `user_skill_progress` -- id (uuid PK), user_id (FK to profiles), skill_id (FK to skills), status (text: 'not_started'/'in_progress'/'completed'), completed_at (timestamptz nullable), created_at
- `user_custom_skills` -- id (uuid PK), user_id (FK to profiles), track_id (FK to skill_tracks), name, status (text), created_at

**Trigger:** Auto-create a profile row when a new user signs up via `auth.users`.

**RLS Policies:**
- `profiles`: Anyone can SELECT; INSERT/UPDATE only for own row (`auth.uid() = id`)
- `skill_tracks`: SELECT for all authenticated; no INSERT/UPDATE/DELETE (admin-seeded)
- `skills`: SELECT for all authenticated; no INSERT/UPDATE/DELETE
- `user_skill_progress`: SELECT/INSERT/UPDATE only for own rows
- `user_custom_skills`: SELECT/INSERT/UPDATE only for own rows

**Enable RLS** on all tables.

---

## Step 3: Seed Pre-defined Skill Roadmaps

Insert default skill tracks and skills using a data insert:

1. **DSA Track** -- Arrays, Linked Lists, Stacks & Queues, Trees, Graphs, Sorting Algorithms, Dynamic Programming, Recursion, Hashing, Greedy Algorithms
2. **Web Development Track** -- HTML/CSS Basics, JavaScript Fundamentals, React Basics, State Management, REST APIs, Node.js/Express, Databases (SQL), Authentication, Deployment, Testing
3. **System Design Track** -- Scalability Basics, Load Balancing, Caching, Database Design, API Design, Message Queues, Microservices, CAP Theorem, Monitoring & Logging, Security Fundamentals

---

## Step 4: Supabase Client Setup

Create `src/integrations/supabase/client.ts` with the Supabase JS client, and generate TypeScript types for the database tables.

---

## Step 5: Authentication Pages

**Files to create:**
- `src/pages/Auth.tsx` -- Login and Sign Up forms (email/password) using Supabase auth, with toggle between login/signup modes
- `src/contexts/AuthContext.tsx` -- React context providing current user, session, loading state, and sign-out function. Uses `onAuthStateChange` listener.
- `src/components/ProtectedRoute.tsx` -- Wrapper that redirects unauthenticated users to `/auth`

---

## Step 6: Onboarding Page

**File:** `src/pages/Onboarding.tsx`

After first signup, user selects:
- Role: Junior or Senior (radio buttons)
- Skill tracks to follow (checkboxes for DSA, Web Dev, System Design)

On submit: updates profile with role, initializes `user_skill_progress` rows for all skills in selected tracks (status = 'not_started').

---

## Step 7: Dashboard Page

**File:** `src/pages/Dashboard.tsx`

Shows:
- Welcome header with user's display name
- Overall progress card (% of all tracked skills completed)
- Level badge: Beginner (0-33%), Intermediate (34-66%), Advanced (67-100%)
- Per-track progress cards with progress bars
- "Recommended Next Steps" section: first uncompleted skill per track
- Quick action buttons to navigate to roadmap views

---

## Step 8: Skill Roadmap Page

**File:** `src/pages/Roadmap.tsx`

Shows:
- Tab/selector for each skill track the user follows
- Ordered list of skills in the selected track
- Each skill shows: name, description, difficulty badge, status indicator
- Buttons to change status: Not Started / In Progress / Completed
- Section to add custom skills to a track

---

## Step 9: Profile Page

**File:** `src/pages/Profile.tsx`

Shows:
- Display name (editable), role, year, college, bio
- Avatar placeholder
- Skills overview with level per track
- Edit profile form

---

## Step 10: Navigation & Layout

**Files to create:**
- `src/components/Layout.tsx` -- App shell with sidebar/top nav and main content area
- `src/components/Navbar.tsx` -- Navigation links: Dashboard, Roadmap, Profile, Sign Out

**Routes to add in App.tsx:**
- `/auth` -- Auth page (public)
- `/onboarding` -- Onboarding (protected)
- `/dashboard` -- Dashboard (protected, default after login)
- `/roadmap` -- Skill Roadmap (protected)
- `/profile` -- Profile (protected)

---

## Step 11: Color Theme Update

Update CSS variables for a motivating blue/green palette:
- Primary: blue tone for main actions
- Accent/success: green for progress indicators and completed states
- Keep clean, modern feel with good contrast

---

## Technical Details

- All database queries use the Supabase JS client with proper typing
- React Query (`@tanstack/react-query`) for data fetching, caching, and mutations
- Level calculation is a pure utility function based on completion percentage
- "Next step" recommendation is derived client-side by finding the first skill with status != 'completed' in track order
- Form handling with react-hook-form + zod validation where needed
- Toast notifications (sonner) for success/error feedback
- Responsive design using Tailwind's responsive utilities throughout
