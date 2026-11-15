// NATIVE_APP=1 builds the static export that ships inside the iOS app (see capacitor.config.ts).
const isNativeApp = process.env.NATIVE_APP === "1";

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development' || isNativeApp,
  register: !isNativeApp,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_NATIVE_APP: isNativeApp ? "1" : "",
    NEXT_PUBLIC_API_BASE: isNativeApp
      ? process.env.NEXT_PUBLIC_API_BASE || "https://chordsofguitar.com"
      : process.env.NEXT_PUBLIC_API_BASE || "",
  },
  ...(isNativeApp
    ? {
        images: { unoptimized: true },
        // API routes and the server-rendered sitemap stay on the website.
        exportPathMap: async (defaultPathMap) => {
          const paths = { ...defaultPathMap };
          delete paths["/sitemap.xml"];
          return paths;
        },
      }
    : {
        async redirects() {
          return [];
        },
      }),
};

module.exports = withPWA(nextConfig);
