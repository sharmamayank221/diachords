import React from "react";
import LegalPage from "@/components/LegalPage";

export default function SupportPage() {
  return (
    <LegalPage
      title="Help & support"
      description="Answers to common questions about ChordsofGuitar and how to contact us."
      canonical="/support"
      updated="November 10, 2026"
    >
      <h2>I can&rsquo;t hear anything</h2>
      <p>
        Turn up the volume and check Bluetooth headphones are connected. The app plays even with the silent switch on.
        If sound stops after a phone call, stop and start the jam or metronome again.
      </p>

      <h2>The tuner or chord detection doesn&rsquo;t react</h2>
      <p>
        Allow microphone access: Settings &rsaquo; ChordsofGuitar &rsaquo; Microphone. Play one string at a time close
        to the phone, away from background noise.
      </p>

      <h2>Where do exported backing tracks go?</h2>
      <p>
        Tap &ldquo;Save WAV&rdquo; in the jam&rsquo;s options. When rendering finishes, the share sheet opens: choose
        &ldquo;Save to Files&rdquo;, AirDrop, or send it to your recording app.
      </p>

      <h2>Does it work offline?</h2>
      <p>
        Yes. Chords, scales, backing tracks, the tuner, metronome, ear training and your library all work without a
        connection. YouTube tutorials and TONE3000 tones need internet.
      </p>

      <h2>How do saved chords sync between my iPhone and iPad?</h2>
      <p>
        Through iCloud, with no sign-in. Make sure you&rsquo;re signed in to the same Apple ID on both and that iCloud is
        on for ChordsofGuitar (Settings &rsaquo; your name &rsaquo; iCloud). The app&rsquo;s library is separate from a
        website account.
      </p>

      <h2>How do I delete my website account?</h2>
      <p>On the website, open the account menu and choose Delete account. The app has no account to delete.</p>

      <h2>Contact us</h2>
      <p>
        Email <a href="mailto:chordsofguitar@gmail.com">chordsofguitar@gmail.com</a> and we&rsquo;ll get back to you
        within a few days.
      </p>
    </LegalPage>
  );
}
