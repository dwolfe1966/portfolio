import Link from "next/link";
import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Section } from "@/components/site/Section";
import { projects } from "@/lib/projects";

export const metadata: Metadata = buildMetadata({
  title: "Products | David Wolfe",
  description: "Product case studies and implementation notes for lifecycle and acquisition operating systems.",
  path: "/projects"
});

export default function ProjectsIndexPage() {
  return (
    <Section eyebrow="Products" title="Product systems and case studies">
      <div className="grid grid-2" style={{ marginTop: 18 }}>
        {projects.map((project) => (
          <div key={project.slug} className="card caseStudyCard">
            <p className={`statusPill ${project.status === "live" ? "live" : "progress"}`}>{project.status === "live" ? "Live tool" : "In progress"}</p>
            <h3 className="caseStudyCardTitle">{project.title}</h3>
            <p className="caseStudyBody">{project.summary}</p>
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
