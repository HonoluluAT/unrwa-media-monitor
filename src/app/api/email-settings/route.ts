import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await sql`SELECT * FROM email_settings WHERE active = TRUE LIMIT 1`;
  return NextResponse.json(rows[0] || null);
}

export async function POST(req: Request) {
  const { email, frequency } = await req.json();
  await sql`DELETE FROM email_settings`;
  const row = await sql`
    INSERT INTO email_settings (email, frequency) VALUES (${email}, ${frequency}) RETURNING *
  `;
  return NextResponse.json(row[0]);
}
