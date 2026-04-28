import { Metadata } from "next";

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const siteUrl = rawSiteUrl.replace(/\/$/, "");

export const siteName = "David Wolfe";
export const defaultTitle = "David Wolfe — AI-driven revenue systems";
export const defaultDescription = "Portfolio of David Wolfe: AI-driven revenue systems for subscription and data businesses.";

function absoluteUrl(path: string) {
  return new URL(path, `${siteUrl}/`).toString();
}

export function buildMetadata({
  title,
  description,
  path
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  const image = absoluteUrl("/og/default.png");

  return {
    title,
    description,
    alternates: {
      canonical: path
    },
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${title} — ${siteName}`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  };
}
