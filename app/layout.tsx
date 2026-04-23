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
        <header className="siteHeader">
          <nav>
            <Link href="/"><strong>David Wolfe</strong></Link>
            <div className="links">
              <Link href="/">Home</Link>
              <Link href="/about">About</Link>
              <Link href="/projects">Projects</Link>
              <Link href="/writing">Writing</Link>
              <Link href="/contact">Contact</Link>
            </div>
            <div>
              <Link className="btn primary" href="/contact">Get in touch</Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
