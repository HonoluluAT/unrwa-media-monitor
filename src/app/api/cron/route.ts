import { sql } from "@/lib/db";
import { sendReport } from "@/lib/email";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scanRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scan`, {
    method: "POST",
  });
  const scanData = await scanRes.json();

  try {
    const emailSettings = await sql`SELECT * FROM email_settings WHERE active = TRUE LIMIT 1`;
    if (emailSettings.length > 0 && process.env.RESEND_API_KEY) {
      const articles = await sql`SELECT * FROM articles ORDER BY date DESC LIMIT 50`;
      await sendReport(emailSettings[0].email, articles);
    }
  } catch (e) {
    console.error("Email send failed:", e);
  }

  return NextResponse.json(scanData);
}
