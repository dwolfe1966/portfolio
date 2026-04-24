import Link from 'next/link'
import { AcquisitionFlowDiagram } from '@/components/AcquisitionFlowDiagram'
import { Section } from '@/components/site/Section'

/**
 * The project page for the Agent‑Managed Acquisition prototype. This page
 * follows the same structure as the Lifecycle Revenue Engine case study and
 * introduces a second flagship project focused on automating paid
 * acquisition. It describes the problem, outlines the thesis, visualises
 * the architecture, and summarises the components built. Replace the
 * placeholder text and lists with your final content. Use the
 * AcquisitionFlowDiagram component to display the system architecture.
 */
export default function AgentAcquisitionProjectPage() {
  return (
    <>
      <Section eyebrow="Case study" title="Agent‑Managed Acquisition">
        <p className="text-gray-700 max-w-3xl mb-6">
          A closed‑loop paid acquisition engine where AI agents generate ad
          creatives, build test cells, monitor performance, and reallocate
          budgets based on cost‑per‑acquisition and lifetime value. This
          prototype shows how AI can compress the feedback loop between
          creative, targeting, and spend—reducing waste and amplifying
          winners.
        </p>
        <div className="flex space-x-4">
          <Link
            href="/demo/acquisition/dashboard"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Open acquisition app
          </Link>
          <Link
            href="/projects"
            className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
          >
            Back to projects
          </Link>
        </div>
      </Section>

      {/* Problem */}
      <Section title="The problem">
        <p className="text-gray-700 max-w-3xl">
          Paid acquisition teams often run dozens of campaigns across multiple
          channels, creative formats, and audience segments. Manual testing
          and budget tuning lead to slow iteration, wasted spend, and
          unscalable workflows. Marketers struggle to know which creative
          resonates with which audience and how to allocate budgets in real
          time.
        </p>
      </Section>

      {/* Thesis */}
      <Section title="The thesis">
        <p className="text-gray-700 max-w-3xl">
          An AI‑driven acquisition engine can design, test, and optimise
          campaigns continuously. By generating creatives, selecting
          audiences, and reallocating budget based on CAC vs LTV, the
          system collapses an entire marketing organisation into a set of
          orchestrated agents. This reduces wasted spend and accelerates
          learning.
        </p>
      </Section>

      {/* Architecture */}
      <Section title="System architecture" subtitle="How it works">
        <p className="text-gray-700 max-w-3xl mb-6">
          The engine is composed of modular services that communicate via
          APIs and share a common data store. At a high level, it consists
          of a campaign manager, creative generator, audience selector,
          agent orchestrator, ad platform integrations, performance
          analytics, and a database. The diagram below illustrates the
          flow from campaign setup through creative generation, test
          cells, budget shifts, and reporting.
        </p>
        <AcquisitionFlowDiagram />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <div className="border p-4 rounded-lg shadow-sm bg-white">
            <h3 className="font-semibold mb-1">Campaign Manager</h3>
            <p className="text-sm text-gray-700">
              Stores campaign definitions, manages state transitions, and
              exposes endpoints to create, update, and pause campaigns.
            </p>
          </div>
          <div className="border p-4 rounded-lg shadow-sm bg-white">
            <h3 className="font-semibold mb-1">Creative Generator</h3>
            <p className="text-sm text-gray-700">
              Uses generative AI to produce ad copy and images, scores
              creatives based on predicted performance, and iterates on
              winning ideas.
            </p>
          </div>
          <div className="border p-4 rounded-lg shadow-sm bg-white">
            <h3 className="font-semibold mb-1">Audience & Keywords</h3>
            <p className="text-sm text-gray-700">
              Suggests demographic, interest, and keyword segments using
              clustering and language models, generating long‑tail and
              negative keywords as needed.
            </p>
          </div>
          <div className="border p-4 rounded-lg shadow-sm bg-white">
            <h3 className="font-semibold mb-1">Agent Orchestrator</h3>
            <p className="text-sm text-gray-700">
              Combines creatives and audiences into test cells, allocates
              budgets, monitors performance, and reassigns spend to
              higher‑performing cells on a regular cadence.
            </p>
          </div>
          <div className="border p-4 rounded-lg shadow-sm bg-white">
            <h3 className="font-semibold mb-1">Ad Platform Integrations</h3>
            <p className="text-sm text-gray-700">
              Connectors to channels such as Google and Meta. These can be
              stubbed in the prototype and swapped for real APIs later.
            </p>
          </div>
          <div className="border p-4 rounded-lg shadow-sm bg-white">
            <h3 className="font-semibold mb-1">Performance Analytics</h3>
            <p className="text-sm text-gray-700">
              Aggregates spend and performance data, computes KPIs like
              CPA, ROAS, and LTV, and feeds the agent with optimisation
              signals.
            </p>
          </div>
        </div>
      </Section>

      {/* Commercial framing */}
      <Section title="Commercial framing">
        <p className="text-gray-700 max-w-3xl">
          This system is not just a novelty; it is designed to move the
          needle on acquisition economics. By adjusting spend based on
          CAC and projected LTV, it treats advertising like a financial
          portfolio. Research shows that AI can cut wasted ad spend by
          double‑digit percentages and boost returns【269540208442071†L8-L23】.
        </p>
      </Section>

      {/* What I built */}
      <Section title="What I built">
        <p className="text-gray-700 max-w-3xl">
          For this prototype I designed a data model for campaigns, creatives,
          audiences, test cells, and budget activities; built an API for
          creating and running campaigns; integrated OpenAI for copy
          generation; created a simple stub for ad networks; and built
          dashboards for spend, CAC, ROAS, and budget reallocation. The
          system logs every automated action for auditability and supports
          human overrides.
        </p>
      </Section>

      {/* Browse projects */}
      <Section>
        <Link href="/projects" className="text-blue-600 hover:underline">
          Browse other projects
        </Link>
      </Section>
    </>
  )
}