import React from "react";
import LegalPage from "@/components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      description="How ChordsofGuitar handles your data on the website and in the iOS app."
      canonical="/privacy"
      updated="November 10, 2026"
    >
      <p>
        ChordsofGuitar (&ldquo;we&rdquo;) runs chordsofguitar.com and the ChordsofGuitar iOS app. This policy explains what
        we collect, why, and the choices you have. You can use every practice tool without an account.
      </p>

      <h2>Microphone</h2>
      <p>
        The tuner, chord detection and scale practice listen to your guitar through the microphone. Audio is analysed in
        real time on your device. It is never recorded, stored or sent to us or anyone else.
      </p>

      <h2>Your library in the iOS app</h2>
      <p>
        The app has no accounts. Chords you save are stored in your own iCloud account so they sync across your Apple
        devices; we never receive them. To remove them, unsave them in the app, or turn off iCloud for ChordsofGuitar in
        Settings &rsaquo; your name &rsaquo; iCloud.
      </p>

      <h2>Website account (optional)</h2>
      <p>If you sign in on the website with Google or an email link, we store:</p>
      <ul>
        <li>your email address and an account ID;</li>
        <li>the chords you save to your library.</li>
      </ul>
      <p>
        We use this only to sign you in and sync your library. Accounts are hosted by Supabase. You can delete your
        account and saved chords at any time from the account menu on the website. Deletion is immediate and permanent.
      </p>

      <h2>Usage analytics</h2>
      <p>
        We use PostHog and Google Analytics to understand which features are used (for example pages viewed and practice
        tools started) so we can improve the product. The website also uses Vercel Analytics. We don&rsquo;t sell your
        data, show ads, or track you across other companies&rsquo; apps and websites.
      </p>

      <h2>Stored on your device</h2>
      <p>
        Settings such as your last jam session, metronome tempo, preferred input device, recent searches and any amp or
        cabinet tones you import are stored locally on your device and never uploaded.
      </p>

      <h2>Third-party services you choose to use</h2>
      <ul>
        <li>
          <strong>TONE3000</strong>: if you browse amp models, you sign in to TONE3000 and the tones you pick are
          downloaded to your device. TONE3000&rsquo;s own privacy policy applies to that sign-in.
        </li>
        <li>
          <strong>YouTube</strong>: chord pages suggest a tutorial video. We send the chord name to YouTube&rsquo;s search
          API from our server; watching a video happens on YouTube.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        ChordsofGuitar is suitable for all ages, but accounts are not intended for children under 13, and we don&rsquo;t
        knowingly collect personal data from them.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests: <a href="mailto:chordsofguitar@gmail.com">chordsofguitar@gmail.com</a>.
      </p>
    </LegalPage>
  );
}
