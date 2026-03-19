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

export async function scanMedia(
  keywords: string[],
  countries: { code: string; name: string }[]
): Promise<Article[]> {
  const countryNames = countries.map((c) => c.name).join(", ");
  const today = new Date().toISOString().slice(0, 10);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `You are a media monitoring analyst for UNRWA. Today is ${today}.

TASK: Search for recent news articles (past 7 days, up to 14 if few results) from media outlets in: ${countryNames}.

Search EACH keyword SEPARATELY:
${keywords.map((k, i) => `${i + 1}. "${k}"`).join("\n")}

RULES:
- Only include articles from media outlets based in: ${countryNames}
- If an article matches multiple keywords, list it ONCE with all matching keywords
- For each article write a 2-paragraph English summary
- Score relevance 0-100 (how directly it covers UNRWA/related topics)
- Assess sentiment toward UNRWA: positive, neutral, or negative
- Include the direct URL to the original article

RESPOND WITH ONLY valid JSON. No markdown, no backticks, no text before or after:

{
  "articles": [
    {
      "title": "Headline in original language",
      "source": "Outlet name",
      "country": "Country name",
      "date": "YYYY-MM-DD",
      "url": "https://...",
      "keywords": ["matched", "keywords"],
      "relevance": 85,
      "sentiment": "neutral",
      "summary_en": "Paragraph 1...\\n\\nParagraph 2..."
    }
  ]
}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonStr = textBlock.text
    .replace(/\`\`\`json\\s*/g, "")
    .replace(/\`\`\`\\s*/g, "")
    .trim();

  const parsed = JSON.parse(jsonStr);
  return parsed.articles || [];
}
