import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const articles = await sql`SELECT * FROM articles ORDER BY date DESC LIMIT 200`;
  return NextResponse.json(articles);
}
