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
  openGraph: {
    title: "mdshare — Share markdown instantly, free",
    description:
      "Free markdown sharing. Upload, get a link, collaborate. No login, no accounts, no cost.",
    siteName: "mdshare",
    type: "website",
    url: "https://mdshare.live",
  },
  twitter: {
    card: "summary",
    title: "mdshare — Share markdown instantly, free",
    description:
      "Free markdown sharing. Upload, get a link, collaborate. No login, no accounts, no cost.",
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
              "keywords": "markdown, sharing, MCP, model context protocol, collaboration, free"
            })
          }}
        />
        {children}
      </body>
    </html>
  );
}
