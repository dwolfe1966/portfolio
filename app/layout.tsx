import "./globals.css";
import React from "react";
import { NavBar } from "@/components/site/NavBar";

export const metadata = {
  title: "David Wolfe — AI-driven revenue systems",
  description: "Portfolio of David Wolfe: AI-driven revenue systems for subscription and data businesses."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <NavBar />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
