import type { Metadata } from "next";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const imageUrl = new URL("/og.png", base).toString();

  return {
    metadataBase: base,
    title: "Revenue Cycle Lab | Healthcare RCM Training",
    description:
      "A hands-on fictional system simulator for patient collections, payment posting, AR collections, and denial management.",
    icons: {
      icon: "/og.png",
      shortcut: "/og.png",
    },
    openGraph: {
      title: "Revenue Cycle Lab",
      description: "Train every workflow. Coach every decision.",
      type: "website",
      images: [{ url: imageUrl, width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Revenue Cycle Lab",
      description: "Train every workflow. Coach every decision.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
