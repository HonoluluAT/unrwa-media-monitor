import { sql } from "@/lib/db";
import { scanMedia } from "@/lib/claude-scanner";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const step = url.searchParams.get("step");
    const singleKeyword = url.searchParams.get("keyword");

    const countries = await sql`SELECT code, name FROM countries WHERE active = TRUE`;
    const ctList = countries.map((c: any) => ({ code: c.code, name: c.name }));

    let kwList: string[];

    if (step === "search-and-save" && singleKeyword) {
      kwList = [singleKeyword];
    } else {
      const keywords = await sql`SELECT keyword FROM keywords WHERE active = TRUE`;
      kwList = keywords.map((k: any) => k.keyword).slice(0, 3);
    }

    const articles = await scanMedia(kwList, ctList);
    const batchId = new Date().toISOString().slice(0, 10);

    let inserted = 0;
    for (const a of articles) {
      try {
        await sql`
          INSERT INTO articles (title, source, country, date, url, keywords, relevance, sentiment, summary_en, scan_batch)
          VALUES (${a.title}, ${a.source}, ${a.country}, ${a.date}, ${a.url}, ${a.keywords}, ${a.relevance}, ${a.sentiment}, ${a.summary_en}, ${batchId})
          ON CONFLICT (url) DO UPDATE SET
            relevance = EXCLUDED.relevance,
            sentiment = EXCLUDED.sentiment,
            summary_en = EXCLUDED.summary_en
        `;
        inserted++;
      } catch (err) {
        console.error("Insert error:", a.url, err);
      }
    }

    await sql`
      INSERT INTO scan_history (scan_date, article_count, keywords_used, countries_scanned)
      VALUES (${batchId}, ${inserted}, ${kwList}, ${ctList.map((c: any) => c.name)})
    `;

    return NextResponse.json({ ok: true, found: articles.length, saved: inserted });
  } catch (error: any) {
    console.error("Scan failed:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
