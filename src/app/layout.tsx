import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UNRWA Media Monitor",
  description: "Media monitoring for Austria & Switzerland",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
