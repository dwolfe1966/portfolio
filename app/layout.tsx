import "./globals.css";
import Link from "next/link";
import React from "react";

export const metadata = {
  title: "David Wolfe — AI-driven revenue systems",
  description: "Portfolio of David Wolfe: AI-driven revenue systems for subscription and data businesses."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/"><strong>David Wolfe</strong></Link>
          <div className="links">
            <Link href="/about">About</Link>
            <Link href="/projects/lifecycle-revenue-engine">Project</Link>
            <Link href="/writing/ai-revenue-systems">Writing</Link>
            <Link href="/demo/dashboard">Demo</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
