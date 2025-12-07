import { GetServerSideProps } from "next";
import getIDs from "@/helpers/getIDs";

const SITE_URL = "https://chordsofguitar.com";

function generateSiteMap(chordIds: string[]) {
  const currentDate = new Date().toISOString().split("T")[0];

  // Static pages
  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "weekly" },
    { url: "/scales", priority: "0.9", changefreq: "weekly" },
    { url: "/tuner", priority: "0.9", changefreq: "monthly" },
    { url: "/metronome", priority: "0.9", changefreq: "monthly" },
    { url: "/jam", priority: "0.9", changefreq: "weekly" },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  ${staticPages
    .map(
      (page) => `
  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join("")}
  ${chordIds
    .map(
      (id) => `
  <url>
    <loc>${SITE_URL}/chords/${id}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("")}
</urlset>`;
}

function SiteMap() {
  // Empty component - getServerSideProps handles the response
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Get all chord IDs
  const chordIds = await getIDs();
  const sitemap = generateSiteMap(chordIds);

  res.setHeader("Content-Type", "text/xml");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate");
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default SiteMap;
