import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mdshare — Share markdown instantly, free",
  description:
    "Free markdown sharing. Upload, get a link, collaborate. No login, no accounts, no cost.",
  alternates: {
    canonical: "https://mdshare.live",
  },
  openGraph: {
    title: "mdshare — Share markdown instantly, free",
    description:
      "Free markdown sharing. Upload, get a link, collaborate. No login, no accounts, no cost.",
    siteName: "mdshare",
    type: "website",
    url: "https://mdshare.live",
    images: [{ url: "https://mdshare.live/og.png", width: 1200, height: 630, alt: "mdshare — Share markdown instantly, free" }],
  },
  twitter: {
    card: "summary",
    title: "mdshare — Share markdown instantly, free",
    description:
      "Free markdown sharing. Upload, get a link, collaborate. No login, no accounts, no cost.",
    images: ["https://mdshare.live/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-200">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "mdshare",
              "url": "https://mdshare.live",
              "description": "Free markdown sharing with MCP integration. Upload, get a link, collaborate. Works with Claude, ChatGPT, Gemini, Cursor, Windsurf.",
              "applicationCategory": "Productivity",
              "operatingSystem": "Any",
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
              "keywords": "markdown, sharing, MCP, model context protocol, collaboration, free, VS Code, Obsidian, link revocation, real-time, WebSocket"
            })
          }}
        />
        {children}
      </body>
    </html>
  );
}
