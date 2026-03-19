import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await sql`
    SELECT scan_date, article_count 
    FROM scan_history 
    ORDER BY scan_date DESC 
    LIMIT 1
  `;
  if (rows.length > 0) {
    return NextResponse.json({ date: rows[0].scan_date, count: rows[0].article_count });
  }
  return NextResponse.json({ date: null, count: 0 });
}
