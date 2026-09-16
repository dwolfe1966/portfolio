import { Section } from "@/components/site/Section";
import { LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";

export default function CompoundingExpertiseDocsPage() {
  return (
    <>
      <LabWorkflowRail active="Docs" />
      <Section eyebrow="Methodology" title="How the Compounding Expertise Lab works">
        <p>
          The Lab separates three sources: Hamilton Helmer&apos;s Seven Powers, Ben Sun&apos;s Compounding Expertise thesis,
          and David Wolfe&apos;s extensions around transferability, heterogeneity, marginal information gain,
          compressibility, causal quality, nonstationarity, and learning velocity.
        </p>
      </Section>

      <Section title="Toy simulator">
        <div className="card">
          <p>
            The simulator uses monthly steps. New cases enter a pending queue and become effective only after
            `ceil(feedbackDelayDays / 30)` monthly steps. Effective graded experience decays by monthly staleness.
          </p>
          <pre className="code">{`N_eff(t+1) = (1 - staleness_rate) * N_eff(t)
             + cases_whose_feedback_matures_at_t

E(t) = base_capability
     + learning_efficiency
       * information_value
       * transferability
       * ln(1 + N_eff(t))`}</pre>
          <p className="small">
            This is an exploratory toy model, not an empirical law or forecast.
          </p>
        </div>
      </Section>

      <Section title="Scorebook inspection">
        <div className="card">
          <p>
            The scorebook is inspectable because case-level evidence is the object under test:
            case, decision, outcome, and grade. Missing outcomes and unresolved grades remain visible
            because coverage and latency are themselves diagnostics.
          </p>
          <p className="small">
            Bundled example rows are synthetic illustrative fixtures, not actual company data.
          </p>
        </div>
      </Section>

      <Section title="Evidence statuses">
        <div className="grid grid-4">
          <div className="card"><h3>Observed</h3><p>Directly seen in product, customer, or operating data.</p></div>
          <div className="card"><h3>Sourced</h3><p>Supported by cited materials or explicit external evidence.</p></div>
          <div className="card"><h3>Assumed</h3><p>A live hypothesis used for structured reasoning.</p></div>
          <div className="card"><h3>Unknown</h3><p>Not yet supported enough to score confidently.</p></div>
        </div>
      </Section>
    </>
  );
}
