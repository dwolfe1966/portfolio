import React from "react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="hero">
      <div className="eyebrow">Portfolio</div>
      <h1>AI-driven revenue systems for subscription and data businesses</h1>
      <p>
        I design and operate product, lifecycle, and growth systems that turn real-world
        signals into measurable business outcomes.
      </p>
      <p>
        Former CEO and product operator with deep experience in subscription businesses,
        consumer data products, and AI-enabled operating leverage.
      </p>
      <div className="ctaRow">
        <Link className="btn primary" href="/projects/lifecycle-revenue-engine">View flagship product</Link>
        <Link className="btn" href="/writing/ai-revenue-systems">Read point of view</Link>
      </div>
    </section>
  );
}
