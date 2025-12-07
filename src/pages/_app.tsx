import Head from "next/head";
import { store } from "../app/store";
import { Provider } from "react-redux";
import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/react";

import "@/styles/globals.css";
import Layout from "@/components/Layout";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

if (typeof window !== "undefined") {
  // checks that we are client-side
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug(); // debug mode in development
    },
  });
}



export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
      <PostHogProvider client={posthog}>
    <Provider store={store}>
      <Head>
        <title>ChordsofGuitar.com - Guitar Chords & Scales</title>
        <meta name="description" content="Learn guitar chords, scales, and jam with AI backing tracks. The ultimate guitar learning companion." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1BD79E" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ChordsofGuitar.com" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        
        {/* Open Graph */}
        <meta property="og:title" content="ChordsofGuitar.com - Guitar Chords & Scales" />
        <meta property="og:description" content="Learn guitar chords, scales, and jam with AI backing tracks." />
        <meta property="og:site_name" content="ChordsofGuitar.com" />
        <meta property="og:url" content="https://chordsofguitar.com" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/icons/icon-512x512.png" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <Component {...pageProps} />
        <Analytics />
      </Layout>
      </Provider>
    </PostHogProvider>
  );
}
