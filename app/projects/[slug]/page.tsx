import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Section } from "@/components/site/Section";
import { getProjectBySlug, projects } from "@/lib/projects";
import { LifecyclePipelineDiagram } from "@/components/demo/LifecyclePipelineDiagram";
import { AcquisitionFlowDiagram } from "@/components/acquisition/AcquisitionFlowDiagram";
import { buildMetadata } from "@/lib/seo";
import { VickreyAuctionDiagram } from "@/components/projects/VickreyAuctionDiagram";
import { ProjectFlowTimeline } from "@/components/projects/ProjectFlowTimeline";
import { CaseStudyArtifacts } from "@/components/projects/CaseStudyArtifacts";
import { DemoAppLaunchCard, type DemoAppLaunchTarget } from "@/components/site/DemoAppLaunchCard";

type PageProps = { params: Promise<{ slug: string }> };

function resolveLaunchTarget(slug: string): DemoAppLaunchTarget {
  if (slug === "agent-acquisition") return "acquisition";
  if (slug === "vickrey-auction-closed-ads-ecosystem") return "auction";
  return "lifecycle";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return buildMetadata({
      title: "Project not found | David Wolfe",
      description: "The requested project case study could not be found.",
      path: "/projects"
    });
  }

  return buildMetadata({
    title: `${project.title} | David Wolfe`,
    description: project.summary,
    path: `/projects/${project.slug}`
  });
}

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
        {project.appHref ? (
          <div style={{ maxWidth: 520, marginTop: 16 }}>
            <DemoAppLaunchCard
              app={resolveLaunchTarget(project.slug)}
              href={project.appHref}
            />
          </div>
        ) : null}
        <div className="ctaRow">
          <Link className="btn" href="/projects">Back to projects</Link>
        </div>
      </Section>
      <Section title="The problem"><p>{project.problem}</p></Section>
      <Section title="The thesis"><p>{project.thesis}</p></Section>
      <Section title="System flow">
        {project.slug === "agent-acquisition" ? (
          <AcquisitionFlowDiagram />
        ) : project.slug === "lifecycle-revenue-engine" ? (
          <LifecyclePipelineDiagram deltas={45} candidates={20} messages={5} outcomes={480} />
        ) : (
          <ProjectFlowTimeline steps={project.architecture} />
        )}
      </Section>
      <Section title="Case-study artifacts">
        <CaseStudyArtifacts artifacts={project.artifacts} />
      </Section>
      <Section title="System architecture">
        <div className="grid grid-2">
          {project.architecture.map((item) => (
            <div key={item.title} className="card"><h3>{item.title}</h3><p>{item.detail}</p></div>
          ))}
        </div>
      </Section>
      {project.slug === "vickrey-auction-closed-ads-ecosystem" ? (
        <Section title="Auction model artifact">
          <VickreyAuctionDiagram />
        </Section>
      ) : null}
      <Section title="KPI callouts">
        <div className="grid grid-3">
          {project.kpiCallouts.map((item) => (
            <div key={item.label} className="card">
              <p className="small">{item.label}</p>
              <div className="kpi">{item.value}</div>
              <p>{item.detail}</p>
            </div>
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
