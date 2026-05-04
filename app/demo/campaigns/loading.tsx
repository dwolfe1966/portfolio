import { Section } from "@/components/site/Section";

export default function CampaignsLoading() {
  return (
    <Section eyebrow="Tools" title="Loading campaign opportunities...">
      <div className="card">
        <p>Fetching candidate opportunities and generated subjects...</p>
      </div>
    </Section>
  );
}
