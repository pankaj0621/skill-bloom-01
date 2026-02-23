

# College Skill Progress Tracker — Implementation Plan

## Overview
A full-stack web app where engineering students track skill progress across curated roadmaps, earn levels, get next-step recommendations, and connect with seniors for mentorship. Built with React + Supabase.

---

## User Flow

1. **Sign Up / Login** → Email & password authentication
2. **Onboarding** → Select role (Junior / Senior), pick skill tracks (e.g., DSA, Web Dev, System Design)
3. **Dashboard** → See overall progress, current level, recommended next steps
4. **Skill Roadmap View** → Browse pre-defined roadmaps + add custom skills, mark milestones as complete
5. **Profile** → Public profile showing skills, levels, and progress stats
6. **Community** → Browse senior profiles, request mentorship, post/answer questions in a Q&A feed
7. **Leaderboard** → See top students by skill area or overall progress

---

## Database Structure (Supabase)

- **profiles** — id, user_id, display_name, avatar_url, role (junior/senior), bio, year, college
- **skill_tracks** — id, name, description, icon, is_default (pre-defined vs custom)
- **skills** — id, track_id, name, description, order, difficulty_level
- **user_skill_progress** — id, user_id, skill_id, status (not_started/in_progress/completed), completed_at
- **user_custom_skills** — id, user_id, track_id, name, status
- **mentorship_requests** — id, from_user_id, to_user_id, message, status (pending/accepted/declined)
- **community_posts** — id, user_id, title, body, skill_track_id, created_at
- **post_replies** — id, post_id, user_id, body, created_at

---

## Feature Phases

### Phase 1 — MVP (Core Tracking)
- Email/password auth with Supabase
- User profiles with junior/senior role selection
- Pre-defined skill roadmaps (DSA, Web Dev, System Design, etc.)
- Skill progress tracking — mark skills as not started / in progress / completed
- **Level system** — Beginner → Intermediate → Advanced based on % completion
- **Next-step recommendations** — highlight the next uncompleted skill in each track
- Personal dashboard with progress overview and stats

### Phase 2 — Community & Mentorship
- Public user profiles showing skills and levels
- Senior directory — browse seniors by skill expertise
- Mentorship request system (send request + message, accept/decline)
- Community Q&A feed — post questions tagged by skill track, seniors can reply
- Notifications for mentorship requests and replies

### Phase 3 — Engagement & Polish
- Leaderboard — rank students by track or overall progress
- Custom skill tracks — students create personal learning paths
- Progress streaks and activity history
- Mobile-optimized responsive design refinements
- Dark mode support

---

## Design Direction
- Clean, modern dashboard layout with cards and progress bars
- Responsive design that works equally well on desktop and mobile
- Soft, motivating color palette (blues/greens for progress indicators)
- Clear visual hierarchy: progress stats → roadmap → community

