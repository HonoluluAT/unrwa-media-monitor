import { sql } from "@/lib/db";
import { searchKeyword, analyzeResults } from "@/lib/claude-scanner";
import { NextResponse } from "next/server";

export const maxDuration = 60;

// POST /api/scan?step=search&keyword=UNRWA
// POST /api/scan?step=analyze
// POST /api/scan (legacy: tries quick single search)
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const step = url.searchParams.get("step");

    const countries = await sql`SELECT code, name FROM countries WHERE active = TRUE`;
    const countryNames = countries.map((c: any) => c.name).join(", ");

    // STEP 1: Search a single keyword and store raw results
    if (step === "search") {
      const keyword = url.searchParams.get("keyword") || "";
      if (!keyword) {
        return NextResponse.json({ ok: false, error: "Missing keyword" }, { status: 400 });
      }

      const results = await searchKeyword(keyword, countryNames);

      // Store raw results in scan_history for later analysis
      await sql`
        INSERT INTO scan_history (scan_date, article_count, keywords_used, countries_scanned)
        VALUES (${new Date().toISOString().slice(0, 10)}, 0, ${[keyword]}, ${countries.map((c: any) => c.name)})
      `;

      // Store raw text in a temp way - append to existing
      const existing = await sql`SELECT keyword FROM keywords WHERE keyword = '__raw_results__'`;
      if (existing.length > 0) {
        // We use the email_settings table creatively to store temp data
      }

      return NextResponse.json({ ok: true, keyword, resultLength: results.length, preview: results.slice(0, 200) });
    }

    // STEP 2: Search one keyword and immediately save articles
    if (step === "search-and-save") {
      const keyword = url.searchParams.get("keyword") || "";
      if (!keyword) {
        return NextResponse.json({ ok: false, error: "Missing keyword" }, { status: 400 });
      }

      const keywords = await sql`SELECT keyword FROM keywords WHERE active = TRUE`;
      const kwList = keywords.map((k: any) => k.keyword);
      const rawResults = await searchKeyword(keyword, countryNames);

      if (!rawResults.trim()) {
        return NextResponse.json({ ok: true, keyword, found: 0, saved: 0 });
      }

      // Small delay before analysis
      await new Promise((r) => setTimeout(r, 3000));

      const articles = await analyzeResults(rawResults, kwList, countryNames);
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

      return NextResponse.json({ ok: true, keyword, found: articles.length, saved: inserted });
    }

    // DEFAULT: Quick single scan (for the Update button)
    const keywords = await sql`SELECT keyword FROM keywords WHERE active = TRUE`;
    const kwList = keywords.map((k: any) => k.keyword);
    const shortKw = kwList.slice(0, 2).join(", "); // Just use first 2 keywords for quick scan

    const rawResults = await searchKeyword(shortKw, countryNames);
    if (!rawResults.trim()) {
      return NextResponse.json({ ok: true, found: 0, saved: 0 });
    }

    await new Promise((r) => setTimeout(r, 3000));

    const articles = await analyzeResults(rawResults, kwList, countryNames);
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
      VALUES (${batchId}, ${inserted}, ${kwList}, ${countries.map((c: any) => c.name)})
    `;

    return NextResponse.json({ ok: true, found: articles.length, saved: inserted });
  } catch (error: any) {
    console.error("Scan failed:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
