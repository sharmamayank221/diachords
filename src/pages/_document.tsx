import { Html, Head, Main, NextScript } from "next/document";

const isNativeApp = process.env.NEXT_PUBLIC_NATIVE_APP === "1";

export default function Document() {
  return (
    <Html lang="en" className={isNativeApp ? "native-app" : undefined}>
      <Head>
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
