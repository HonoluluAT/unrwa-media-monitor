import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  try {
    const tools: any[] = [{ type: "web_search_20250305", name: "web_search" }];

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      tools: tools,
      messages: [
        {
          role: "user",
          content: "Search for recent news articles about UNRWA from Austrian and Swiss media outlets like ORF, NZZ, SRF, Der Standard. List what you find with titles and URLs.",
        },
      ],
    });

    const blocks = response.content.map((b: any) => ({
      type: b.type,
      text: b.type === "text" ? b.text?.slice(0, 500) : undefined,
    }));

    return NextResponse.json({
      ok: true,
      stopReason: response.stop_reason,
      blockCount: response.content.length,
      blocks: blocks,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
```

Commit. After redeploy, open:
```
https://unrwa-media-monitor.vercel.app/api/test-scan
