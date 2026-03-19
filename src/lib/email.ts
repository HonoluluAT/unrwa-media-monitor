import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReport(to: string, articles: any[]) {
  const top = articles
    .sort((a: any, b: any) => b.relevance - a.relevance)
    .slice(0, 10);

  await resend.emails.send({
    from: "UNRWA Monitor <onboarding@resend.dev>",
    to,
    subject: `UNRWA Media Report — ${new Date().toLocaleDateString("en-GB")}`,
    html: `
      <h1>UNRWA Media Monitor — Weekly Report</h1>
      <p>${articles.length} articles found.</p>
      <hr/>
      ${top
        .map(
          (a: any, i: number) => `
        <h3>${i + 1}. ${a.title}</h3>
        <p><strong>${a.source}</strong> | ${a.country} | ${a.date}<br/>
        Relevance: ${a.relevance}% | Sentiment: ${a.sentiment}</p>
        <p>${a.summary_en}</p>
        <p><a href="${a.url}">Read original</a></p>
      `
        )
        .join("<hr/>")}
    `,
  });
}
