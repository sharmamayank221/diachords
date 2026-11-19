import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { store } from "../app/store";
import { Provider } from "react-redux";
import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/react";

import "@fontsource/inter/400";
import "@fontsource/inter/500";
import "@fontsource/inter/600";
import "@fontsource/inter/700";
import "@fontsource/space-grotesk/400";
import "@fontsource/space-grotesk/500";
import "@fontsource/space-grotesk/600";
import "@fontsource/space-grotesk/700";
import "@fontsource/manrope/400";
import "@fontsource/manrope/500";
import "@fontsource/manrope/600";
import "@fontsource/manrope/700";
import "@fontsource/lora/400";
import "@fontsource/lora/500";
import "@fontsource/lora/600";
import "@fontsource/lora/700";
import "@/styles/globals.css";
import Layout from "@/components/Layout";
import { IS_NATIVE_APP, patchBundledFetch, patchMicAudioSession, preferPlaybackAudioSession } from "@/lib/native";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { AuthProvider } from "@/contexts/AuthContext";
import * as gtag from "@/lib/gtag";

patchBundledFetch();
patchMicAudioSession();

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
  });
}

type NextPageWithLayout = AppProps["Component"] & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

export default function App({ Component, pageProps }: AppProps) {
  const PageComponent = Component as NextPageWithLayout;
  const getLayout = PageComponent.getLayout ?? ((page: React.ReactElement) => <Layout>{page}</Layout>);
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    if (!IS_NATIVE_APP) return;
    preferPlaybackAudioSession();
    import("@capacitor/status-bar")
      .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: Style.Dark }))
      .catch(() => {});
    import("@capacitor/splash-screen")
      .then(({ SplashScreen }) => SplashScreen.hide())
      .catch(() => {});
  }, []);

  return (
    <AuthProvider>
      {gtag.GA_MEASUREMENT_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_MEASUREMENT_ID}`}
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gtag.GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                });
              `,
            }}
          />
        </>
      )}
      <PostHogProvider client={posthog}>
        <Provider store={store}>
          <Head>
            <title>ChordsofGuitar.com - Guitar Chords &amp; Scales</title>
            <meta name="description" content="Learn guitar chords, scales, and jam with AI backing tracks. The ultimate guitar learning companion." />
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

            {/* PWA Meta Tags */}
            {!IS_NATIVE_APP && <link rel="manifest" href="/manifest.json" />}
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

            {/* Google Search Console Verification */}
            <meta name="google-site-verification" content="viU1cq9SDi_l7ZqBa93316kKaPmYOcC5v0B7CglNvrI" />
          </Head>
          {getLayout(<Component {...pageProps} />)}
          {!IS_NATIVE_APP && <Analytics />}
        </Provider>
      </PostHogProvider>
    </AuthProvider>
  );
}
