import React from "react";
import LegalPage from "@/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      description="Terms for using the ChordsofGuitar website and iOS app."
      canonical="/terms"
      updated="November 10, 2026"
    >
      <p>
        By using chordsofguitar.com or the ChordsofGuitar app you agree to these terms. If you don&rsquo;t agree, please
        don&rsquo;t use the service.
      </p>

      <h2>The service</h2>
      <p>
        ChordsofGuitar provides chord diagrams, scales, backing tracks and practice tools for learning guitar. It&rsquo;s
        free to use. We may add, change or remove features at any time.
      </p>

      <h2>Your account</h2>
      <p>
        Accounts exist only on the website. You&rsquo;re responsible for activity on your account and can delete it at
        any time from the account menu.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&rsquo;t misuse the service, try to break it, or access it in automated ways that put load on it.</li>
        <li>Only import amp, pedal or cabinet models you have the right to use.</li>
      </ul>

      <h2>Content you create</h2>
      <p>
        Backing tracks you render and export are yours to use for practice, recordings and performances. Tones you
        download from TONE3000 remain under the licence chosen by their creator.
      </p>

      <h2>Apple</h2>
      <p>
        If you use the iOS app, Apple&rsquo;s standard Licensed Application End User License Agreement also applies.
        Apple is not responsible for the app or its content.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; without warranties. To the extent allowed by law, we aren&rsquo;t
        liable for indirect or consequential losses arising from its use.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:chordsofguitar@gmail.com">chordsofguitar@gmail.com</a>
      </p>
    </LegalPage>
  );
}
