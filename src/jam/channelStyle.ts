// "Sound like this YouTube channel" for the jam (iOS app, Apple Intelligence). The app reads the
// channel's recent video titles (backing-track titles usually name the style, key and BPM) and
// the on-device model turns them into a style profile that steers "New idea".
import { CapacitorHttp } from "@capacitor/core";
import { NativeShell } from "@/lib/native";
import { STYLES, STYLE_BY_ID } from "./styles";
import { Mode, noteToPc } from "./theory";

export interface ChannelStyle {
  url: string;
  channel: string;
  styles: string[];
  mode: "major" | "minor" | "both";
  tempoMin: number;
  tempoMax: number;
  mood: string;
  harmony: string;
  summary: string;
  titles: string[];
  /** The video the user pasted, when they started from a video rather than a channel. */
  focusTitle?: string;
  /** Key named in that video's title, e.g. "(Dm)" or "in Bb major". */
  focusKey?: { key: string; mode: Mode };
}

/** Backing-track titles usually name the key: "Velvet Jazz (Dm)", "Slow Blues in A", "E minor jam". */
export function keyFromTitle(title: string): { key: string; mode: Mode } | null {
  const m =
    title.match(/\(\s*([A-G][#b♯♭]?)\s*(m|min|minor|maj|major)?\s*\)/i) ??
    title.match(/\b(?:in|key of)\s+([A-G][#b♯♭]?)\s*(m|min|minor|maj|major)?\b/i) ??
    title.match(/\b([A-G][#b♯♭]?)\s*(minor|major)\b/i);
  if (!m) return null;
  const key = m[1][0].toUpperCase() + m[1].slice(1).replace("♯", "#").replace("♭", "b");
  if (noteToPc(key) === null) return null;
  return { key, mode: m[2] && /^m(in(or)?)?$/i.test(m[2]) && m[2] !== "M" ? "minor" : "major" };
}

const STORAGE_KEY = "jam.channelStyle";
const CHANNEL_ID = /(UC[\w-]{22})/;

export function loadChannelStyle(): ChannelStyle | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved?.styles?.length ? saved : null;
  } catch {
    return null;
  }
}

export function saveChannelStyle(style: ChannelStyle | null): void {
  try {
    if (style) localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

function channelPageUrl(input: string): string {
  const text = input.trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (/^(www\.|m\.)?youtube\.com\//i.test(text)) return `https://${text}`;
  return `https://www.youtube.com/${text.startsWith("@") ? text : `@${text}`}`;
}

// Native HTTP: youtube.com doesn't send CORS headers, so the web view can't fetch it directly.
// A desktop user agent, because the mobile site leaves the channel id and titles out of the page.
async function getText(url: string): Promise<string> {
  const res = await CapacitorHttp.get({
    url,
    responseType: "text",
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: "CONSENT=YES+1",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    },
  });
  if (res.status >= 400) throw new Error(`YouTube returned ${res.status}`);
  return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
}

const decode = (s: string) => {
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
};
const unescapeJson = (s: string) => {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s;
  }
};

const VIDEO_ID = /(?:[?&]v=|youtu\.be\/|\/shorts\/|\/live\/|\/embed\/)([\w-]{11})/;

interface ChannelRead {
  url: string;
  channel: string;
  titles: string[];
  /** Set when the user pasted a video: the track they want more of. */
  focus?: { title: string; description: string };
}

async function readChannel(input: string): Promise<ChannelRead> {
  const url = channelPageUrl(input);
  let id = url.match(/\/channel\/(UC[\w-]{22})/)?.[1];
  let channel = "";
  let focus: ChannelRead["focus"];
  const titles: string[] = [];

  const videoId = url.match(VIDEO_ID)?.[1];
  if (videoId) {
    const page = await getText(`https://www.youtube.com/watch?v=${videoId}`);
    id = page.match(/"videoDetails":\{[^{}]*?"channelId":"(UC[\w-]{22})"/)?.[1] ?? page.match(/"channelId":"(UC[\w-]{22})"/)?.[1];
    channel = unescapeJson(page.match(/"ownerChannelName":"((?:[^"\\]|\\.)*)"/)?.[1] ?? "");
    const title = decode(page.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? "");
    const description = unescapeJson(page.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)?.[1] ?? "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 400);
    if (title) {
      focus = { title, description };
      titles.push(title);
    }
  } else if (!id) {
    const page = await getText(url.replace(/\/(videos|featured|streams|shorts)\/?$/, "") + "/videos");
    id =
      page.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1] ??
      page.match(/"externalId":"(UC[\w-]{22})"/)?.[1] ??
      page.match(/"channelId":"(UC[\w-]{22})"/)?.[1];
    channel = decode(page.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? "");
    Array.from(page.matchAll(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"\}\]/g)).forEach((m) => titles.push(unescapeJson(m[1])));
    Array.from(page.matchAll(/"lockupMetadataViewModel":\{"title":\{"content":"((?:[^"\\]|\\.)*)"/g)).forEach((m) => titles.push(unescapeJson(m[1])));
  }
  if (!id || !CHANNEL_ID.test(id)) throw new Error("Couldn’t find that channel. Paste a channel or video link, like youtube.com/@name.");

  const feed = new DOMParser().parseFromString(await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`), "text/xml");
  channel ||= feed.querySelector("feed > title")?.textContent ?? "";
  feed.querySelectorAll("entry > title").forEach((t) => t.textContent && titles.push(t.textContent));

  const unique = Array.from(new Set(titles.map((t) => t.trim()).filter((t) => t.length > 3))).slice(0, 40);
  if (!unique.length) throw new Error("That channel has no public videos to learn from.");
  return { url: `https://www.youtube.com/channel/${id}`, channel: channel || "this channel", titles: unique, focus };
}

/** Reads a channel and asks Apple Intelligence what kind of backing tracks it makes. */
export async function learnChannelStyle(input: string): Promise<ChannelStyle> {
  const { url, channel, titles, focus } = await readChannel(input);
  const profile = await NativeShell.analyzeChannelStyle({
    channel,
    titles,
    focus: focus ? `${focus.title}. ${focus.description}` : undefined,
    styles: STYLES.map((s) => ({ id: s.id, description: `${s.name}: ${s.description}` })),
  });
  const styles = profile.styles.filter((id) => STYLE_BY_ID[id]);
  if (!styles.length) throw new Error("Couldn’t match that channel to a jam style.");
  return {
    ...profile,
    styles,
    url,
    channel,
    titles: titles.slice(0, 12),
    focusTitle: focus?.title,
    focusKey: (focus && keyFromTitle(focus.title)) || undefined,
  };
}

/** Prompt text that describes the channel to the idea generator. */
export function channelInspiration(style: ChannelStyle): string {
  const focus = style.focusTitle ? ` Above all, like the track “${style.focusTitle}”.` : "";
  return `“${style.channel}”. ${style.summary} Mood: ${style.mood}. Harmony: ${style.harmony}.${focus} Example video titles: ${style.titles
    .slice(0, 6)
    .join("; ")}.`;
}
