import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await sql`SELECT * FROM keywords WHERE active = TRUE ORDER BY id`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { keyword } = await req.json();
  const row = await sql`
    INSERT INTO keywords (keyword) VALUES (${keyword})
    ON CONFLICT (keyword) DO UPDATE SET active = TRUE RETURNING *
  `;
  return NextResponse.json(row[0]);
}

export async function DELETE(req: Request) {
  const { keyword } = await req.json();
  await sql`UPDATE keywords SET active = FALSE WHERE keyword = ${keyword}`;
  return NextResponse.json({ ok: true });
}
