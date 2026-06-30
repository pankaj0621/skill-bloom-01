## Senior-dev makeover — 3 phases

App ka pura redesign + security ek hi turn mai shipping karna risky hai (50+ files badlenge, regressions ki garunty). Isiliye 3 phases mai todunga. Har phase apne aap mai shippable hai — aap ek-ek karke approve karenge.

---

### Phase 1 — Security foundations & "trust" features (start here)
Ye sabse jyada value deti hai aur dikhti bhi hai.

- **HIBP leaked-password check** on signup/password-change (free, built into Cloud).
- **Audit log table** (`audit_logs`) — sensitive events: login, password change, profile update, role change, account delete. Visible to admins; users see apna own log in Settings → Security.
- **Account export** — Settings → Security → "Download my data" → JSON dump (profile, skills, progress, badges, messages, guidance requests).
- **Account delete** — Settings → Security → "Delete account" with confirm-typed-username, cascades via existing FK + edge function for `auth.users`.
- **Input validation hardening** — central Zod schemas for username, display_name, message body, feedback. Server-side triggers re-validate (already partially there).
- **RLS audit pass** — run scanner, fix any leak, tighten policies.
- **Security memory** updated.

> ⚠️ "Rate limiting" — Lovable Cloud mai abhi standard primitive nahi hai, scanner findings bhi ignore karne ke liye documented hai. Ad-hoc per-table counter ban sakta hai but trade-off hai. Phase 1 mai skip, Phase 3 mai 2FA ke saath revisit.

---

### Phase 2 — Design polish across pages (senior craft pass)

Locked tokens (indigo primary, emerald accent, ink-navy bg, Space Grotesk/Inter). Same rhythm everywhere:

- **Dashboard** — quieter hero, real KPI row, weekly trend sparkline, "today's focus" card.
- **Roadmap** — collapsible tracks, sticky progress header, inline difficulty pills, keyboard arrows for status.
- **Progress** — chart polish (axis, tooltip skin), recommendation cards with reason chip.
- **Profile** — banner + meta block, segmented tabs (Overview / Activity / Badges / Security), inline edit with optimistic UI.
- **Settings** — sectioned cards (Account / Security / Notifications / Appearance / Data), each with clear save state.
- **Community + Leaderboard** — denser cards, rank chip, online dot, skeleton shimmer.
- **Empty states + error states** — every page gets one with an action.
- **Micro-motion** — page transitions stay, list items get stagger; nothing bouncy.

```text
┌─ Hero ────────────────────────┐
│ Level 3 · 1,240 XP · 🔥 7d   │
├─ KPI row (4 stat cards) ─────┤
│ Skills · XP · Streak · Rank  │
├─ Today's focus ──────────────┤
│ "Pick where you left off"    │
└──────────────────────────────┘
```

---

### Phase 3 — Advanced auth & ops

- **2FA (TOTP)** — enroll via authenticator app (Google Authenticator / 1Password), 6-digit verify on login, recovery codes.
- **Active sessions list** — Settings → Security, list devices/IP from `auth.sessions` via edge function with service role, "sign out everywhere" button.
- **Admin audit dashboard** — searchable table of `audit_logs` with filters (event type, user, date).
- **Soft rate-limit** — per-user counter table on guidance requests, feedback, password reset (ad-hoc, documented trade-off).

---

### Technical notes

- New tables (Phase 1): `audit_logs`. Cascade rules via FK already in place for most user-owned tables.
- New edge functions: `account-export`, `account-delete`, (Phase 3) `list-sessions`, `revoke-sessions`.
- Auth config: enable HIBP via `configure_auth`.
- TypeScript types regenerate after migrations.
- No `<noscript>` tracking in `<head>`; semantic tokens only; no hardcoded colors.

---

### What I'll do right now if you approve

**Start Phase 1 only.** Migration for `audit_logs`, enable HIBP, ship export/delete edge functions + Settings UI section. Verify with build + a quick browser run.

Approve to start Phase 1, ya bolo "sirf design phase 2 do" / "directly 2FA Phase 3 chahiye".
