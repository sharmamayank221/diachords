import Head from "next/head";
import { store } from "../app/store";
import { Provider } from "react-redux";
import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/react";

import "@/styles/globals.css";
import Layout from "@/components/Layout";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <Head>
        <title className="capitalize">Chords of Guitar</title>
        <meta property="og:title" content={"Chords of Guitar"} />
        <meta property="og:site_name" content={"chordsofguitar"} />
        <meta property="og:url" content={"chordsofguitar.com"} />
        <meta property="og:description" content={"guitar chords"} />
        <meta property="og:type" content={"website"} />
        <meta property="og:image" content="/logo.svg"></meta>
      </Head>
      <Layout>
        <Component {...pageProps} />
        <Analytics />
      </Layout>
    </Provider>
  );
}
