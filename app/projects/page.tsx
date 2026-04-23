import Link from "next/link";
import { Section } from "@/components/site/Section";
import { projects } from "@/lib/projects";

export default function ProjectsIndexPage() {
  return (
    <Section eyebrow="Projects" title="Case studies and systems">
      <p>Selected AI-native product and growth systems with commercial framing and implementation detail.</p>
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        {projects.map((project) => (
          <div key={project.slug} className="card">
            <p className="small">{project.status === "live" ? "Live demo" : "In progress"}</p>
            <h3>{project.title}</h3>
            <p>{project.summary}</p>
            <div className="ctaRow">
              <Link className="btn" href={`/projects/${project.slug}`}>View case study</Link>
              {project.appHref && <Link className="btn primary" href={project.appHref}>Open app</Link>}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
