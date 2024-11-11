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
        <title className="capitalize">Chords of Guitar</title>
        <meta property="og:title" content={"Chords of Guitar"} />
        <meta
          property="og:description"
          content={
            "Learn Guitar chords easily with the visual guitar chords learning method."
          }
        />
        <meta property="og:site_name" content={"chordsofguitar"} />
        <meta property="og:url" content={"www.chordsofguitar.com"} />
        <meta property="og:description" content={"guitar chords"} />
        <meta property="og:type" content={"website"} />
        <meta property="og:image" content="/logo.svg"></meta>
      </Head>
      <Layout>
        <Component {...pageProps} />
        <Analytics />
      </Layout>
      </Provider>
    </PostHogProvider>
  );
}
