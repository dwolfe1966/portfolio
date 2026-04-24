import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/site/Section";
import { getProjectBySlug, projects } from "@/lib/projects";
import { LifecyclePipelineDiagram } from "@/components/demo/LifecyclePipelineDiagram";
import { AcquisitionFlowDiagram } from "@/components/acquisition/AcquisitionFlowDiagram";

type PageProps = { params: Promise<{ slug: string }> };

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const index = projects.findIndex((p) => p.slug === slug);
  const prev = index > 0 ? projects[index - 1] : null;
  const next = index < projects.length - 1 ? projects[index + 1] : null;

  return (
    <>
      <Section eyebrow="Project" title={project.title}>
        <p>{project.summary}</p>
        <div className="ctaRow">
          <Link className="btn primary" href={project.appHref ?? "/demo"}>
            {project.slug === "agent-acquisition" ? "Open acquisition app" : "Open lifecycle app"}
          </Link>
          <Link className="btn" href="/projects">Back to projects</Link>
        </div>
      </Section>
      <Section title="The problem"><p>{project.problem}</p></Section>
      <Section title="The thesis"><p>{project.thesis}</p></Section>
      <Section title="System flow">
        {project.slug === "agent-acquisition" ? (
          <AcquisitionFlowDiagram />
        ) : (
          <LifecyclePipelineDiagram deltas={45} candidates={20} messages={5} outcomes={480} />
        )}
      </Section>
      <Section title="System architecture">
        <div className="grid grid-2">
          {project.architecture.map((item) => (
            <div key={item.title} className="card"><h3>{item.title}</h3><p>{item.detail}</p></div>
          ))}
        </div>
      </Section>
      <Section title="Commercial framing"><p>{project.commercialFraming}</p></Section>
      <Section title="What I built"><p>{project.whatIBuilt}</p></Section>
      <Section title="Browse projects">
        <div className="ctaRow">
          {prev ? <Link className="btn" href={`/projects/${prev.slug}`}>← {prev.title}</Link> : <span className="small">No previous project</span>}
          {next ? <Link className="btn" href={`/projects/${next.slug}`}>{next.title} →</Link> : <span className="small">No next project</span>}
        </div>
      </Section>
    </>
  );
}
