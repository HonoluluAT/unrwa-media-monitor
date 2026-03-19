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
        allResults += `\n--- Switzerland: "${kw}" ---\n${r}\n`;
      } catch (e: any) {
        console.error(`CH search failed for "${kw}":`, e.message);
      }
      await delay(15000);
    }
  }

  if (!allResults.trim()) return [];

  await delay(15000);

  // Convert to structured JSON
  const jsonResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `Here are search results for UNRWA-related news from Austrian and Swiss media (${weekAgo} to ${today}):

${allResults}

Create a JSON object listing ALL unique articles found. Deduplicate by URL. If an article matched multiple keywords, list it once with all matching keywords.

For each article provide:
- title: original language headline
- source: outlet name
- country: "Austria" or "Switzerland"
- date: YYYY-MM-DD
- url: full URL to the article
- keywords: which of these matched: ${keywords.join(", ")}
- relevance: 0-100 (how directly it covers UNRWA/Lazzarini/Palestine refugees)
- sentiment: "positive", "neutral", or "negative" toward UNRWA
- summary_en: a detailed English summary of 4-6 substantial paragraphs. Cover the key facts, quotes, political context, reactions from different parties, and the broader significance for UNRWA operations and funding. Be thorough and analytical, similar to a professional media briefing.
Include ALL articles found, even if only tangentially related. Better to include more than miss important coverage.

CRITICAL: Return ONLY raw JSON. No explanation. No markdown. Start with { end with }

{"articles":[]}`,
      },
    ],
  });

  const textBlock = jsonResponse.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed.articles || [];
  } catch (e) {
    console.error("JSON parse failed:", jsonStr.slice(0, 500));
    return [];
  }
}
