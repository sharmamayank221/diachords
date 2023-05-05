import Script from "next/script";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
        <Script
          type="text/javascript"
          src="//www.midijs.net/lib/midi.js"
          async
        ></Script>
      </body>
    </Html>
  );
}
