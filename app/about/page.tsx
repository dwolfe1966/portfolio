import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = buildMetadata({
  title: "About | David Wolfe",
  description: "About David Wolfe: AI practitioner and product, growth, and operations leader.",
  path: "/about"
});

const competencies = [
  { title: "Product discovery & design", detail: "Translate ambiguous demand signals into concrete hypotheses and shipped product loops." },
  { title: "Machine learning & data science", detail: "Build practical scoring and simulation systems that improve decision quality, not just analytics dashboards." },
  { title: "Agentic AI implementation", detail: "Design and ship agent workflows with explicit policies, audit trails, operator controls, and measurable business feedback loops." },
  { title: "Growth marketing & monetization", detail: "Optimize CAC, retention, and LTV with clear measurement and explicit budget discipline." },
  { title: "Engineering & operations", detail: "Turn strategy into reliable workflows, instrumentation, and repeatable team execution." },
  { title: "Executive leadership", detail: "Align product, data, marketing, and finance around shared commercial outcomes and operating cadence." }
];

const experienceHighlights = [
  {
    company: "Goldbelly",
    logo: "Goldbelly",
    logoSrc: "https://www.google.com/s2/favicons?domain=goldbelly.com&sz=128",
    role: "Head of Growth and Chief Product Officer",
    context: "National food ecommerce marketplace",
    evidence: "Led growth and product work in a marketplace where national demand generation had to connect with merchant supply, gifting occasions, logistics, and repeat purchase behavior."
  },
  {
    company: "Napster",
    logo: "napster",
    logoSrc: "https://www.google.com/s2/favicons?domain=napster.com&sz=128",
    role: "Chief Technology Officer",
    context: "Subscription media and music technology",
    evidence: "Led product and technology across subscription music, web, mobile, APIs, and engineering operations during the Best Buy acquisition period."
  },
  {
    company: "MyLife / Reunion.com",
    logo: "MyLife",
    logoSrc: "https://www.google.com/s2/favicons?domain=mylife.com&sz=128",
    role: "Product and technology executive",
    context: "Consumer identity, social graph, and subscription product",
    evidence: "Led roadmap, product, and technology work for a high-scale consumer identity and social-graph subscription business."
  },
  {
    company: "BuyWithMe",
    logo: "BuyWithMe",
    logoSrc: "https://www.google.com/s2/favicons?domain=buywithme.com&sz=128",
    role: "Chief Product Officer / COO",
    context: "Local commerce and marketplace operations",
    evidence: "Led product, marketing, design, and engineering in a local commerce marketplace where merchant supply, consumer demand, and city-level execution all had to work together."
  },
  {
    company: "Interactive One / Radio One",
    logo: "Interactive One",
    logoSrc: "https://www.google.com/s2/favicons?domain=interactiveone.com&sz=128",
    role: "Chief Product and Operating Officer",
    context: "Digital media, community, and advertising platform",
    evidence: "Led product and operations across digital media properties, community products, advertising systems, and broadcast-linked audience platforms."
  },
  {
    company: "Propel Media",
    logo: "Propel Media",
    logoSrc: "https://www.google.com/s2/favicons?domain=propelmedia.com&sz=128",
    role: "Product, technology, and growth leadership",
    context: "Computational advertising and marketplace systems",
    evidence: "Built product, marketplace, machine-learning, and growth systems for performance advertising where CAC, quality, pacing, and monetization were tightly coupled."
  }
];

const operatingProof = [
  "Subscription and consumer media",
  "Marketplace design and ecommerce",
  "Performance advertising and CAC/LTV economics",
  "Product, engineering, data, growth, and operations leadership"
];

export default function AboutPage() {
  return (
    <>
      <Section eyebrow="About" title="AI practitioner building systems that turn decisions into revenue">
        <div className="aboutIntroGrid">
          <div>
            <p>
              I build operating systems that connect product strategy, data science, and go-to-market
              execution. The work is direct: I write the schema, ship the app, and own the operating
              cadence around it.
            </p>
            <p>
              I work as an AI practitioner, not just an AI strategist: translating model capabilities
              into agentic workflows, decision policies, simulations, and operator-facing software.
            </p>
            {process.env.NEXT_PUBLIC_LINKEDIN_URL ? (
              <p className="small" style={{ marginTop: 12 }}>
                More context on{" "}
                <a href={process.env.NEXT_PUBLIC_LINKEDIN_URL} target="_blank" rel="noreferrer noopener">
                  LinkedIn
                </a>
                {process.env.NEXT_PUBLIC_LINKEDIN_HEADLINE
                  ? ` — ${process.env.NEXT_PUBLIC_LINKEDIN_HEADLINE}.`
                  : "."}
              </p>
            ) : null}
          </div>
          <div className="profileProofCard" aria-label="Selected operating contexts">
            <p className="small">Selected operating contexts</p>
            <div className="companyChipGrid">
              <span>Napster</span>
              <span>Goldbelly</span>
              <span>MyLife</span>
              <span>BuyWithMe</span>
              <span>Interactive One</span>
              <span>Propel Media</span>
            </div>
            <div className="profileRule" />
            {operatingProof.map((item) => (
              <p className="small proofLine" key={item}>{item}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Where Product Strategy Became Operating Systems">
        <div className="experienceGrid">
          {experienceHighlights.map((item) => (
            <div className="experienceCard" key={item.company}>
              <div>
                <div className="experienceLogo" aria-label={`${item.company} logo`}>
                  <Image
                    src={item.logoSrc}
                    alt={`${item.company} logo`}
                    width={140}
                    height={38}
                    unoptimized
                  />
                </div>
                <p className="small">{item.context}</p>
                <h3>{item.company}</h3>
                <strong>{item.role}</strong>
              </div>
              <p>{item.evidence}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Core competencies">
        <div className="grid grid-2">
          {competencies.map((item) => (
            <div className="card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How I work">
        <div className="grid grid-2">
          <div className="card">
            <h3>Strategy and execution in one loop</h3>
            <p>
              I combine operating strategy with direct implementation so teams get both direction and
              delivery momentum. No handoffs that lose fidelity between the deck and the deploy.
            </p>
          </div>
          <div className="card">
            <h3>AI pragmatism, not AI theatre</h3>
            <p>
              AI should improve throughput, decision quality, and economics — not add complexity for
              its own sake. Every system I build can answer &quot;what changed because of this?&quot;
              with measured outcomes.
            </p>
          </div>
          <div className="card">
            <h3>Hands-on engineering still</h3>
            <p>
              I started as an engineer and still write the code. That depth is what lets me connect
              strategy to production systems — data contracts, APIs, and operator workflows — without
              translation loss.
            </p>
          </div>
          <div className="card">
            <h3>Operator instinct</h3>
            <p>
              Most of what I ship is the bit-of-software a small team didn&apos;t have time to build:
              the operator console, the audit feed, the policy engine. The boring infrastructure that
              makes the agent loop trustworthy.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Let’s collaborate">
        <p>
          I take on operator-builder engagements where strategy and code live close together —
          revenue systems, AI-native operating consoles, marketplace mechanics, lifecycle plumbing.
          If that maps to a problem you&apos;re solving, the contact form below is the fastest path.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/contact">Start a conversation</Link>
          <Link className="btn" href="/projects">Review case studies</Link>
        </div>
      </Section>
    </>
  );
}
