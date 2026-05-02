import "./globals.css";
import React from "react";
import { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { defaultDescription, defaultTitle, siteName } from "@/lib/seo";

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const siteUrl = rawSiteUrl.replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s"
  },
  description: defaultDescription,
  openGraph: {
    siteName,
    type: "website",
    title: defaultTitle,
    description: defaultDescription
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
