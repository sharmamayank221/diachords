import type { GetServerSideProps } from "next";
import getIDs from "@/helpers/getIDs";

const SITE_URL = "https://chordsofguitar.com";

// Most-wanted pages first, with higher priority, so crawlers find the tools quickly
const STATIC_PAGES: { path: string; priority: number; changefreq: string }[] = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/chords", priority: 0.9, changefreq: "weekly" },
  { path: "/tuner", priority: 0.9, changefreq: "monthly" },
  { path: "/metronome", priority: 0.9, changefreq: "monthly" },
  { path: "/scales", priority: 0.8, changefreq: "monthly" },
  { path: "/practice", priority: 0.8, changefreq: "monthly" },
];

function buildSitemap(chordIds: string[]): string {
  const urls = [
    ...STATIC_PAGES.map(
      (p) => `<url><loc>${SITE_URL}${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority.toFixed(1)}</priority></url>`
    ),
    ...chordIds.map(
      (id) => `<url><loc>${SITE_URL}/chords/${encodeURIComponent(id)}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const ids: string[] = await getIDs();
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate");
  res.write(buildSitemap(ids));
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
