/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [];
  },
  async rewrites() {
    return [
      {
        source: '/chords/:key(c|d|e|f|g|a|b)sharp:suffix*',
        destination: '/chords/:key%23:suffix*',
      },
      {
        source: '/chords/:key(c|d|e|f|g|a|b)%23:suffix*',
        destination: '/chords/:key%23:suffix*',
      },
    ];
  },
};

module.exports = nextConfig;
