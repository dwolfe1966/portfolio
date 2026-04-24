# Codex Implementation Specification – Site & Demo Enhancements

This document captures the improvements requested for the **davidwolfe.app** portfolio site and its accompanying demo applications.  It distills the high‑level UX recommendations into concrete actions Codex can execute.  Each section lists the affected files, describes the purpose of the change, and includes skeleton code where appropriate.

## 1. Navigation & Information Architecture

### Requirements

* Replace the existing navigation bar with a concise, five‑item menu: **Home**, **About**, **Projects**, **Writing**, and **Contact**.  The “Projects” item should link to a new index page listing all case studies.
* The navigation should be sticky and responsive.  On small screens it collapses into a hamburger menu.

### Files & Structure

* `src/components/NavBar.tsx` – new or updated component implementing the simplified nav bar.  Use a minimal tailwind layout and highlight the active route.
* `src/app/projects/page.tsx` – a new page that lists all projects.  Each project shows a title, a one‑sentence summary, a “View Project” link and optionally a thumbnail.

### Sample Code Snippet

```tsx
// src/components/NavBar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/writing', label: 'Writing' },
  { href: '/contact', label: 'Contact' },
]

export function NavBar() {
  const pathname = usePathname()
  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center h-16 px-4">
        <div className="flex-1" />
        <ul className="flex space-x-4">
          {navItems.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`font-medium ${pathname === href ? 'text-blue-600' : 'text-gray-700'} hover:text-blue-500`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
```

## 2. Projects Index Page

### Requirements

* Provide a landing page listing each project (e.g. **Lifecycle Revenue Engine**, **Agent‑Managed Paid Acquisition**) with a brief description and call‑to‑action button.
* The page reads from a static array or CMS to keep the list maintainable.

### Files

* `src/app/projects/page.tsx` – new route for `/projects`.

### Sample Code Snippet

```tsx
// src/app/projects/page.tsx
import { Section } from '@/components/site/Section'
import Link from 'next/link'

const projects = [
  {
    slug: 'lifecycle-revenue-engine',
    title: 'Lifecycle Revenue Engine',
    summary: 'A system that detects meaningful external changes, matches them to user intent and generates targeted outreach.',
  },
  {
    slug: 'agent-acquisition',
    title: 'Agent‑Managed Acquisition',
    summary: 'A closed‑loop paid acquisition engine where agents generate creatives, test cells and reallocate budget.',
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
```

## 3. Lifecycle Demo Enhancements

### 3.1 Pipeline Flow Diagram

Add a visual flowchart showing how **events** become **candidates**, turn into **messages**, and feed into **outcomes**.  Keep the design minimal and responsive.  The component can either load an SVG (see `assets/pipeline.png`) or build the diagram from primitives.  Codex should import the image and include it on the project page and in the demo overview.

Files to add:

* `src/components/PipelineDiagram.tsx` – wraps an `<img>` tag referencing the generated image.

### Sample Code Snippet

```tsx
// src/components/PipelineDiagram.tsx
export function PipelineDiagram() {
  return (
    <div className="flex justify-center">
      {/* Replace the image path with the appropriate import once placed in the public folder */}
      <img src="/images/pipeline.png" alt="Pipeline flow from events to outcomes" className="max-w-full h-auto" />
    </div>
  )
}
```

You can find a placeholder flowchart graphic in `codex_assets/images/pipeline.png`.  Include it in the Next.js `public` folder or import it into the component.

### 3.2 Scoring Settings UI

Provide an interface for adjusting weighting coefficients in the priority score (interest score, recency, segment value, change significance).  Users should be able to move sliders or input numeric values.  When one weight is adjusted, the others scale proportionally.  A “lock” checkbox allows a weight to remain fixed while others adjust【574565776970297†L202-L214】【574565776970297†L274-L280】.

Files to add:

* `src/components/ScoringSettings.tsx`

### Sample Code Snippet

```tsx
// src/components/ScoringSettings.tsx
import { useState } from 'react'

export function ScoringSettings({ defaults = { interest: 0.45, recency: 0.2, segment: 0.25, change: 0.1 }, onChange }) {
  const [weights, setWeights] = useState(defaults)
  const [locked, setLocked] = useState({ interest: false, recency: false, segment: false, change: false })

  // Rebalance weights so that sum is 1.0 when one value changes.
  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    const newWeights = { ...weights, [key]: value }
    const lockedKeys = Object.keys(locked).filter(k => locked[k as keyof typeof locked])
    const freeKeys = Object.keys(weights).filter(k => !locked[k as keyof typeof locked] && k !== key)
    const lockedSum = lockedKeys.reduce((acc, k) => acc + newWeights[k as keyof typeof newWeights], 0)
    const freeSum = freeKeys.reduce((acc, k) => acc + newWeights[k as keyof typeof newWeights], 0)
    const remaining = 1 - value - lockedSum
    // Rescale free weights proportionally
    freeKeys.forEach(k => {
      newWeights[k as keyof typeof newWeights] = (newWeights[k as keyof typeof newWeights] / freeSum) * remaining
    })
    setWeights(newWeights)
    onChange?.(newWeights)
  }

  return (
    <div className="space-y-4 p-4 border rounded-md bg-gray-50">
      {Object.keys(weights).map(key => (
        <div key={key} className="flex items-center space-x-3">
          <label className="w-24 capitalize">{key}</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={weights[key as keyof typeof weights]}
            onChange={e => handleWeightChange(key as keyof typeof weights, parseFloat(e.target.value))}
            className="flex-1"
          />
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={weights[key as keyof typeof weights].toFixed(2)}
            onChange={e => handleWeightChange(key as keyof typeof weights, parseFloat(e.target.value))}
            className="w-16 border px-1 py-0.5"
          />
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={locked[key as keyof typeof locked]}
              onChange={e => setLocked({ ...locked, [key]: e.target.checked })}
            />
            <span className="text-xs">Lock</span>
          </label>
        </div>
      ))}
    </div>
  )
}
```

### 3.3 Simulation Visualisations

Use charts to display simulation results.  Show the number of deltas processed, candidates created, and messages generated.  Present open rate, click‑through rate and conversion rate in a funnel diagram.  Use a library like **Recharts** or **Chart.js**; keep colours simple and remove gridlines to reduce clutter【429982028471656†L142-L167】.  The component should accept arrays of numbers and render bar or funnel charts.

Files to add:

* `src/components/SimulationCharts.tsx` – chart component using Recharts (to be installed via npm).

### Sample Code Snippet

```tsx
// src/components/SimulationCharts.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function SimulationCharts({ data }) {
  // Example data: [ { name: 'Deltas', value: 50 }, { name: 'Candidates', value: 30 }, ... ]
  return (
    <div className="mt-4">
      <h4 className="font-medium mb-2">Pipeline Metrics</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" hide />
          <YAxis hide />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

### 3.4 Data Definitions Panel

Create a collapsible panel or dedicated page explaining all **input variables** (assumptions and weights) and **output variables** (priority score, recency, segments, change significance, etc.).  It should be easily accessible from the demo for users who need a deeper understanding.

Files:

* `src/components/VariableDefinitions.tsx` – show a definition list (`<dl>`) with terms and descriptions.

## 4. About Page Enhancements

### Requirements

* Add subheadings for competencies beyond revenue generation: product discovery, data science & AI, social ecosystems, high‑performance org design, subscription economics, etc.
* Add a short narrative describing how these competencies connect to the current focus on AI‑enabled growth systems.
* Refactor the timeline into a more concise “Highlights” section if necessary.

### Files

* `src/app/about/page.tsx` – update copy and layout.  Use `<Section>` components to separate topics.

## 5. Agent‑Managed Acquisition System Prototype

### Requirements

* Implement a second demo at `/acquisition` or `/demo-acquisition` following the architecture described in `project2_architecture_usecases.md`.
* Key pages: **Campaign Overview**, **Creative Generator**, **Audience Builder**, **Budget Orchestrator**, **Analytics**.
* For the prototype, stub out ad platform integrations and generate random performance metrics.

### File Structure

```
src/app/acquisition/page.tsx            // top-level landing explaining the system and linking to sub-pages
src/app/acquisition/campaigns/page.tsx   // list of campaigns, create new
src/app/acquisition/campaigns/[id]/page.tsx  // view campaign details
src/app/acquisition/create/page.tsx      // form to create a new campaign
src/components/acquisition/CreativeGenerator.tsx
src/components/acquisition/AudienceSelector.tsx
src/components/acquisition/BudgetManager.tsx
src/components/acquisition/AnalyticsDashboard.tsx
```

### Notes

* Use the same charting guidelines as for the lifecycle engine: simple, clean visuals and limited colours.
* Maintain consistent spacing and typography with the main site design.
* Make all service calls asynchronous and resilient to missing API keys.

## 6. Assets

* A placeholder pipeline diagram is included at `codex_assets/images/pipeline.png`.  Replace it with the final design or generate a new one as needed.  Place final images into the `public/images` folder.

## 7. References

* The weight adjustment UI design draws on UX advice for weighted scoring models, suggesting that sliders or spin‑buttons help users understand the impact of changes and that other weights should adjust automatically to preserve the total【574565776970297†L202-L214】.  Providing lock buttons allows certain weights to remain fixed while others change【574565776970297†L274-L280】.
* Keep visualizations simple and avoid unnecessary decoration; this approach reduces cognitive load and improves comprehension【429982028471656†L142-L167】.
* Use concise navigation labels and limit the number of menu items for better engagement and conversion【458732127021119†L27-L38】.
