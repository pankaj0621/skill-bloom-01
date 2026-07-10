
## Goal
`/auth` page ko dobara design karna — cleaner, premium look — aur **Phone (SMS OTP)** login add karna Google ke saath.

## Auth Methods (final)
1. **Continue with Google** (already working, primary CTA)
2. **Continue with Phone (OTP)** — naya
   - Step 1: Country code + phone number → "Send code"
   - Step 2: 6-digit OTP input → "Verify & continue"
   - Resend timer (30s), change number link
   - Existing account merge logic (`handle_new_user` trigger) already handles duplicate identities by email; phone-only accounts will create fresh profiles and go through onboarding.

Email/password band hi rahega (memory rule).

## Backend
- Lovable Cloud auth mein **Phone provider** enable karna (SMS OTP). Twilio/MessageBird jaisa SMS provider Cloud-managed use hoga — agar credentials chahiye toh user se pooch ke `add_secret` se store karenge (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGE_SERVICE_SID`). Confirm before enabling.
- `supabase.auth.signInWithOtp({ phone })` aur `verifyOtp({ phone, token, type: 'sms' })` use karenge — client-side, koi custom edge function nahi.
- `handle_new_user` trigger already profile create karta hai; phone signups ke liye `display_name` fallback phone number ho jayega — theek hai (user onboarding mein set karega).

## UI Redesign (`src/pages/Auth.tsx`)
Dark premium card, brand-consistent (Primary #6366F1 on #0F172A):
- Left/top: Brand mark + tagline ("Level up your skills.")
- Center card (glass, subtle gradient border):
  - Big Google button (icon + label)
  - Divider "or"
  - Phone form (country selector default +91, tel input, animated OTP boxes on step 2)
  - Fine print: Terms + Privacy
- Micro-animations: framer-motion fade/slide between "phone" and "otp" steps
- Loading + error states via `sonner` toasts
- Mobile-first: full-height, safe-area padding, big tap targets
- Popup/iframe warnings retained for Google

Files touched:
- `src/pages/Auth.tsx` — full rewrite (UI + phone OTP logic)
- Small helper: `src/components/auth/PhoneOtpForm.tsx` (step machine, OTP boxes)
- No DB schema changes required.

## Open questions before build
1. Phone OTP ke liye SMS provider — **Twilio** use karun (most common, Cloud-supported)? Agar haan toh Twilio credentials chahiye honge (SID, Auth Token, Messaging Service SID).
2. Default country code **+91 (India)** rakhun, ya multi-country selector?

Confirm karo — main build mode mein switch hote hi implement kar dunga.
