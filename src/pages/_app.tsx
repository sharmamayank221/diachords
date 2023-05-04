import "@/styles/globals.css";
import { store } from "../app/store";
import { Provider } from "react-redux";
import type { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/react";

import Layout from "@/components/Layout";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <Layout>
        <Component {...pageProps} />
        <Analytics />
      </Layout>
    </Provider>
  );
}
