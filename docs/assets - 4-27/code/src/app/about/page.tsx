import React from "react";

export const metadata = {
  title: "About | David Wolfe",
};

/**
 * The about page communicates the breadth of David Wolfe's expertise beyond
 * revenue engines. It introduces his background, lists core competencies,
 * summarises his career trajectory, and explains his approach to product,
 * growth, and AI. Use this page to position David as a well‑rounded
 * operator and thought leader. Feel free to update the content with real
 * details; the current text is illustrative.
 */
export default function AboutPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 space-y-16">
      {/* Introduction */}
      <section>
        <h1 className="text-3xl font-bold mb-4">About David Wolfe</h1>
        <p className="text-gray-700 leading-relaxed">
          I’m an operator, builder, and product leader with over two decades of
          experience working across software, subscription businesses, data
          products, and AI. I’ve founded companies, scaled teams, and delivered
          products that generate real revenue. Today I focus on designing and
          operating AI‑driven systems that combine product strategy, growth
          mechanics, and data science to unlock new forms of operating
          leverage.
        </p>
      </section>

      {/* Core competencies */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Core Competencies</h2>
        <p className="mb-4 text-gray-700">
          I work across multiple disciplines. Here are a few of the areas where I
          bring the most value:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-medium text-lg mb-2">Product Discovery & Design</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Identifying customer problems and opportunities</li>
              <li>Leading user research and rapid prototyping</li>
              <li>Translating insights into product roadmaps</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-lg mb-2">Growth & Monetisation</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Lifecycle marketing and retention strategy</li>
              <li>Paid acquisition, experimentation, and attribution</li>
              <li>Pricing models and revenue operations</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-lg mb-2">Data Science & AI</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Building and interpreting machine‑learning models</li>
              <li>Designing data pipelines and event tracking</li>
              <li>Applying generative AI to product and growth workflows</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-lg mb-2">Organisational Leadership</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Scaling teams and culture from seed to growth stage</li>
              <li>Aligning cross‑functional teams around clear metrics</li>
              <li>Coaching leaders and creating high‑performance environments</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Experience timeline */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Experience & Milestones</h2>
        <p className="text-gray-700 mb-6">
          A few highlights from my career journey. I’ve worn many hats—founder,
          product leader, CEO—and have consistently bridged the gap between
          strategy and execution.
        </p>
        <ol className="relative border-l border-gray-200">
          <li className="mb-10 ml-6">
            <span className="absolute -left-3 mt-1 w-6 h-6 bg-blue-600 rounded-full"></span>
            <h4 className="text-lg font-medium text-gray-900">2024–Present</h4>
            <p className="text-gray-700">
              Designing AI‑native revenue and acquisition systems as an
              independent builder and advisor.
            </p>
          </li>
          <li className="mb-10 ml-6">
            <span className="absolute -left-3 mt-1 w-6 h-6 bg-blue-600 rounded-full"></span>
            <h4 className="text-lg font-medium text-gray-900">2017–2023</h4>
            <p className="text-gray-700">
              CEO & Chief Product Officer at <em>ExampleCo</em>, where I led
              product strategy and scaled the business from Series A to
              profitability.
            </p>
          </li>
          <li className="ml-6">
            <span className="absolute -left-3 mt-1 w-6 h-6 bg-blue-600 rounded-full"></span>
            <h4 className="text-lg font-medium text-gray-900">2005–2016</h4>
            <p className="text-gray-700">
              Various product and engineering leadership roles at startups
              and public companies, building subscription products and data
              pipelines.
            </p>
          </li>
        </ol>
      </section>

      {/* Approach and philosophy */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Approach & Philosophy</h2>
        <p className="text-gray-700 leading-relaxed">
          I believe that great products emerge at the intersection of clear
          problem framing, iterative execution, and healthy team dynamics. My
          practice combines strategic thinking with hands‑on building: I spend
          as much time in the weeds designing systems and experimenting as I
          do setting the vision. I’m particularly drawn to opportunities where
          AI can fundamentally change how businesses operate—compressing
          decision cycles, amplifying human creativity, and improving unit
          economics.
        </p>
      </section>
    </main>
  );
}