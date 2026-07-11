## Goal
`/auth` page ko dobara design karna — cleaner, premium look — aur **Phone (SMS OTP)** login add karna email/password ke saath.

## Auth Methods (final)
1. **Email/Password** (already working — sign in/sign up tabs)
2. **Continue with Phone (OTP)** — naya
   - Step 1: Country code default +91 + phone number → "Send code"
   - Step 2: 6-digit OTP input → "Verify & continue"
   - Resend timer (30s), change number link
   - Existing account merge logic (`handle_new_user` trigger) already handles duplicate identities by email; phone-only accounts create fresh profiles and go through onboarding.

Google login disabled hi rahega (memory rule).

## Backend
- **Firebase Phone Auth** use kiya gaya hai (free 10k verifications/month, no SMS provider needed).
- Edge function `supabase/functions/firebase-auth/index.ts` Firebase ID token verify karti hai aur Lovable Cloud (`auth.users`) session bridge karti hai.
- Table `public.firebase_auth_users` Firebase UID ↔ `auth.users` mapping store karti hai.
- `handle_new_user` trigger profile create karta hai; phone signups ke liye `display_name` fallback phone number ho jayega — user onboarding mein set karega.

## UI (`src/pages/Auth.tsx`)
Dark premium card, brand-consistent (Primary #6366F1 on #0F172A):
- Left/top: Brand mark + tagline
- Center card (glass, subtle gradient border):
  - Email/Password tabs (sign in / sign up)
  - Divider "or"
  - "Continue with Phone" button
  - Phone form (country selector default +91, tel input, animated OTP boxes on step 2)
  - Fine print: Terms + Privacy
- Micro-animations: framer-motion fade/slide between phone steps
- Loading + error states via `sonner` toasts
- Mobile-first: full-height, safe-area padding, big tap targets

## Files touched
- `src/pages/Auth.tsx` — UI + phone CTA integration
- `src/components/auth/PhoneAuthForm.tsx` — new phone OTP flow (Firebase Web SDK)
- `src/lib/firebase.ts` — Firebase app initialization
- `src/vite-env.d.ts` — Firebase env types
- `.env` — Firebase config placeholders
- `supabase/functions/firebase-auth/index.ts` — new edge function
- `supabase/migrations/*` — `firebase_auth_users` table mapping

## Production setup remaining
1. Firebase project create karo aur **Phone** sign-in method enable karo.
2. Firebase Console → Project Settings → General → Your apps → Web app → config copy karo.
3. `.env` mein `VITE_FIREBASE_*` values fill karo.
4. Vercel/Netlify environment variables mein bhi same `VITE_FIREBASE_*` add karo.
5. Firebase Console → Authentication → Settings → Authorized domains mein published URLs add karo (`skilltrackerlevelup.lovable.app` etc.).
6. Edge function `firebase-auth` already deployed hai; `FIREBASE_PROJECT_ID` secret already saved hai.
