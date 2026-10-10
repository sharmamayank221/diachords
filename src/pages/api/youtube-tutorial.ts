import type { NextApiRequest, NextApiResponse } from "next";

export interface YoutubeTutorialResult {
  videoId:     string | null;
  title:       string | null;
  thumbnail:   string | null;
  channel:     string | null;
  duration:    string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<YoutubeTutorialResult>
) {
  const { chord } = req.query;
  if (!chord || typeof chord !== "string") {
    return res.status(400).json({ videoId: null, title: null, thumbnail: null, channel: null, duration: null });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  // ── No API key: return null so UI shows fallback search card ──────────────
  if (!apiKey) {
    return res.status(200).json({ videoId: null, title: null, thumbnail: null, channel: null, duration: null });
  }

  try {
    const query = `how to play ${chord} guitar chord beginner tutorial`;
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet&q=${encodeURIComponent(query)}&type=video` +
      `&videoCategoryId=10&maxResults=3&relevanceLanguage=en&key=${apiKey}`;

    const searchRes  = await fetch(searchUrl);
    const searchData = await searchRes.json();

    const item = searchData.items?.[0];
    if (!item) {
      return res.status(200).json({ videoId: null, title: null, thumbnail: null, channel: null, duration: null });
    }

    const videoId = item.id?.videoId ?? null;

    // Fetch video duration from contentDetails
    let duration: string | null = null;
    if (videoId) {
      const detailUrl =
        `https://www.googleapis.com/youtube/v3/videos` +
        `?part=contentDetails&id=${videoId}&key=${apiKey}`;
      const detailRes  = await fetch(detailUrl);
      const detailData = await detailRes.json();
      const raw = detailData.items?.[0]?.contentDetails?.duration ?? "";
      // Convert ISO 8601 duration (PT3M45S) to "3:45"
      const match = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const h = parseInt(match[1] ?? "0");
        const m = parseInt(match[2] ?? "0");
        const s = parseInt(match[3] ?? "0");
        duration = h > 0
          ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
          : `${m}:${String(s).padStart(2,"0")}`;
      }
    }

    // Cache for 24h
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    return res.status(200).json({
      videoId,
      title:     item.snippet?.title        ?? null,
      thumbnail: item.snippet?.thumbnails?.high?.url ?? null,
      channel:   item.snippet?.channelTitle ?? null,
      duration,
    });
  } catch {
    return res.status(200).json({ videoId: null, title: null, thumbnail: null, channel: null, duration: null });
  }
}
