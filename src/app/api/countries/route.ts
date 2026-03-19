import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await sql`SELECT * FROM countries ORDER BY active DESC, name`;
  return NextResponse.json(rows);
}

export async function PATCH(req: Request) {
  const { code, active } = await req.json();
  await sql`UPDATE countries SET active = ${active} WHERE code = ${code}`;
  return NextResponse.json({ ok: true });
}
