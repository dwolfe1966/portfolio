import { Section } from "@/components/site/Section";

type DemoSetupNoticeProps = {
  title?: string;
  detail?: string;
};

export function DemoSetupNotice({
  title = "Workspace database is not initialized",
  detail = "Run Prisma schema setup and seed commands against your production database, then redeploy."
}: DemoSetupNoticeProps) {
  return (
    <Section eyebrow="Tools" title={title}>
      <p>{detail}</p>
      <pre className="card" style={{ whiteSpace: "pre-wrap" }}>
        npm run db:generate{"\n"}
        npm run db:migrate:deploy{"\n"}
        npm run db:seed
      </pre>
    </Section>
  );
}
