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
  title: "mdshare — Share markdown instantly",
  description:
    "Zero-login markdown sharing. Upload, get a link, collaborate. No accounts needed.",
  openGraph: {
    title: "mdshare — Share markdown instantly",
    description:
      "Zero-login markdown sharing. Upload, get a link, collaborate. No accounts needed.",
    siteName: "mdshare",
    type: "website",
    url: "https://mdshare.live",
  },
  twitter: {
    card: "summary",
    title: "mdshare — Share markdown instantly",
    description:
      "Zero-login markdown sharing. Upload, get a link, collaborate. No accounts needed.",
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
        {children}
      </body>
    </html>
  );
}
