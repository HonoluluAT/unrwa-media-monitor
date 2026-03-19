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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchWithWebTool(query: string): Promise<string> {
  const tools: any[] = [{ type: "web_search_20250305", name: "web_search" }];

  // First call - Claude will want to use web search
  let response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    tools: tools,
    messages: [{ role: "user", content: query }],
  });

  // Collect all content from multi-turn tool use
  let allMessages: any[] = [
    { role: "user", content: query },
    { role: "assistant", content: response.content },
  ];
  let allText = "";

  // Keep going while Claude wants to use tools
  let loops = 0;
  while (response.stop_reason === "tool_use" && loops < 10) {
    loops++;
    const toolBlocks = response.content.filter((b: any) => b.type === "tool_use");
    const toolResults: any[] = toolBlocks.map((tb: any) => ({
      type: "tool_result",
      tool_use_id: tb.id,
      content: "Search completed. Please provide the results you found.",
    }));

    allMessages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      tools: tools,
      messages: allMessages,
    });

    allMessages.push({ role: "assistant", content: response.content });
  }

  // Collect all text from all responses
  for (const msg of allMessages) {
    if (msg.role === "assistant") {
      const content = Array.isArray(msg.content) ? msg.content : [];
      for (const block of content) {
        if (block.type === "text" && block.text) {
          allText += block.text + "\n";
        }
      }
    }
  }

  return allText;
}

export async function scanMedia(
  keywords: string[],
  countries: { code: string; name: string }[]
): Promise<Article[]> {
  const countryNames = countries.map((c) => c.name).join(", ");
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const kwAll = keywords.slice(0, 3).join('", "');

  let searchResults = "";
  try {
    searchResults = await searchWithWebTool(
      `Search the web for news articles published between ${weekAgo} and ${today} from media outlets in ${countryNames} that mention "${kwAll}". Look specifically at these outlets: ORF, Der Standard, NZZ, SRF, SWI swissinfo.ch, watson.ch, Kurier, Die Presse, Tages-Anzeiger, Blick. List every article you find including the exact title, source name, publication date, and full URL.`
    );
  } catch (e: any) {
    console.error("Search failed:", e.message);
    return [];
  }

  if (!searchResults.trim()) {
    console.error("Search returned empty results");
    return [];
  }

  console.log("Search results length:", searchResults.length);
  console.log("Search preview:", searchResults.slice(0, 300));

  await delay(5000);

  const jsonResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `Here are search results for UNRWA-related news from ${countryNames} media (${weekAgo} to ${today}):

${searchResults}

Create a JSON object with ALL unique articles. For each:
- title: original headline
- source: outlet name
- country: "Austria" or "Switzerland"
- date: YYYY-MM-DD
- url: full URL
- keywords: matching terms from: ${keywords.join(", ")}
- relevance: 0-100
- sentiment: "positive", "neutral", or "negative"
- summary_en: detailed 4-6 paragraph English summary covering key facts, political context, reactions, and significance for UNRWA

Return ONLY raw JSON. No markdown. No explanation. Start with { end with }
{"articles":[]}`,
      },
    ],
  });

  const textBlock = jsonResponse.content.find((b: any) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  let jsonStr = (textBlock as any).text.trim();
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
