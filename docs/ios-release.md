# iOS app release checklist

The iOS app is the same Next.js site, statically exported and wrapped with Capacitor 8.
Bundle ID: `com.chordsofguitar.app`. Native project: `ios/App/App.xcodeproj`.

## Build

```bash
yarn ios:build   # static export (NATIVE_APP=1) -> out/ -> cap sync ios
yarn ios:open    # open in Xcode
yarn ios:assets  # regenerate icon + splash from public/Logo.svg
```

`NEXT_PUBLIC_*` values are baked in at build time, so put them in `.env.production.local`
before `yarn ios:build`:

- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `NEXT_PUBLIC_TONE3000_KEY`
- `NEXT_PUBLIC_API_BASE` (optional, defaults to `https://chordsofguitar.com`)

## Accounts and the library

The app has no sign-in. Saved chords live in the user's iCloud key-value storage
(`NSUbiquitousKeyValueStore`, key `library.savedChords`), so they sync across their Apple devices.
A localStorage copy covers devices signed out of iCloud. Supabase accounts exist only on the website;
the two libraries are separate.

## 1. Deploy the website first

The app calls the live site for some features. Deploy this branch to Vercel so these exist:

- `/api/youtube-tutorial` with CORS for `capacitor://localhost`
- `/tone3000-callback.html` (forwards `app.`-prefixed states back to the app)
- `/privacy`, `/terms`, `/support`
- `/api/delete-account` for website accounts (needs `SUPABASE_SERVICE_ROLE_KEY` set on Vercel)

## 2. TONE3000

The redirect URI stays `https://chordsofguitar.com/tone3000-callback.html`, so nothing changes in TONE3000.

## 3. Apple Developer / Xcode

- Join the Apple Developer Program.
- In Xcode, go to the App target, open Signing & Capabilities and select your Team. The iCloud capability
  with Key-value storage is already in `App.entitlements`. Xcode registers it on the App ID the first time
  it signs with your team. If it asks, tick iCloud > Key-value storage. No CloudKit container is needed.
- Bump `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` for each upload.
- Product > Archive, then Distribute App > App Store Connect, then test via TestFlight.

## 4. App Store Connect listing

- Category: Music (secondary: Education). Age rating: 4+.
- Privacy policy URL: https://chordsofguitar.com/privacy. Support URL: https://chordsofguitar.com/support
- App Privacy labels must match `ios/App/App/PrivacyInfo.xcprivacy`:
  - Product interaction: analytics, not linked to the user.
  - Tracking: no.
  - The saved chords stay in the user's own iCloud and never reach us, so they are not "collected".
- Screenshots: 6.9" iPhone and 13" iPad (the app is universal). Capture them from the simulator with
  `xcrun simctl io booted screenshot shot.png`.
- Export compliance is already answered (`ITSAppUsesNonExemptEncryption = false`).
- Review notes: the microphone is used only for the tuner and chord detection, on device, nothing is recorded.
  There is no account or sign-in; the chord library syncs through the user's iCloud.

## Already handled in the app

- No accounts, so Sign in with Apple (4.8) and in-app account deletion (5.1.1(v)) don't apply.
- Privacy manifest, microphone usage string, and a 1024px icon with no alpha.
- Audio plays with the silent switch on. The screen stays awake while a jam or the metronome is playing.
- Native share sheet for links and exported WAV files. Bundled fonts, so it works offline.
- "New idea" in the jam uses Apple Intelligence on iOS 26+ devices that support it (on-device
  Foundation Models, nothing leaves the phone). Other devices keep the random preset idea.
- Native tab bar, safe-area layout, haptics, and a router that serves exported `.html` pages for deep routes.

Not enabled on purpose: background audio (`UIBackgroundModes: audio`). Add it only if playback should
continue with the screen locked, and be ready to justify it in review.
