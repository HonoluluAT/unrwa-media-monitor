import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Article {
  title: string;
  source: string;
  country: string;
  date: string;
  url: string;
  keywords: string[];
  relevance: number;
  sentiment: "positive" | "neutral" | "negative";
  summary_en: string;
}

const AT_OUTLETS = "ORF, Der Standard, Kurier, Kleine Zeitung, Die Presse, Wiener Zeitung, Salzburger Nachrichten, Parlament Österreich, BMEIA, Profil, Falter, Austrian Development Agency";
const CH_OUTLETS = "NZZ, SRF, SWI swissinfo.ch, watson.ch, Tages-Anzeiger, Blick, 20 Minuten, Le Temps, RTS, Aargauer Zeitung, Basler Zeitung, Berner Zeitung, SP Schweiz, SVP Schweiz";

async function searchOnce(query: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    // @ts-ignore
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: query,
      },
    ],
  });

  let text = "";
  for (const block of response.content) {
    if (block.type === "text") text += block.text + "\n";
  }
  return text;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scanMedia(
  keywords: string[],
  countries: { code: string; name: string }[]
): Promise<Article[]> {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const hasAT = countries.some((c) => c.code === "AT");
  const hasCH = countries.some((c) => c.code === "CH");

  let allResults = "";

  // Search each keyword with country-specific queries
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];

    if (hasAT) {
      try {
        const r = await searchOnce(
          `Search for news articles from the past 7 days (${weekAgo} to ${today}) from Austrian media outlets (${AT_OUTLETS}) mentioning "${kw}". Find as many articles as possible. For each article list: title, source, date, URL.`
        );
        allResults += `\n--- Austria: "${kw}" ---\n${r}\n`;
      } catch (e: any) {
        console.error(`AT search failed for "${kw}":`, e.message);
      }
      await delay(15000);
    }

    if (hasCH) {
      try {
        const r = await searchOnce(
          `Search for news articles from the past 7 days (${weekAgo} to ${today}) from Swiss media outlets (${CH_OUTLETS}) mentioning "${kw}". Find as many articles as possible. For each article list: title, source, date, URL.`
        );
        allResults += `\n--- Switze
