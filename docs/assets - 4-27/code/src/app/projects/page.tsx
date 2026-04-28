import Link from 'next/link'
import { Section } from '@/components/site/Section'

// List of projects to show on the Projects index page.  Extend or replace this list
// as more projects are added to the portfolio.
const projects = [
  {
    slug: 'lifecycle-revenue-engine',
    title: 'Lifecycle Revenue Engine',
    summary:
      'A system that detects meaningful external changes, matches them to user intent and generates targeted outreach.',
  },
  {
    slug: 'agent-acquisition',
    title: 'Agent‑Managed Acquisition',
    summary:
      'A closed‑loop paid acquisition engine where agents generate creatives, test cells and reallocate budget.',
  },
]

export default function ProjectsPage() {
  return (
    <Section eyebrow="Projects" title="Case studies">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map(({ slug, title, summary }) => (
          <div key={slug} className="p-4 border rounded-lg shadow-sm bg-white">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{summary}</p>
            <Link href={`/projects/${slug}`} className="mt-2 inline-block text-blue-600 hover:underline">
              View Project
            </Link>
          </div>
        ))}
      </div>
    </Section>
  )
}
