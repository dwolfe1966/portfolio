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
        <p>
          The V0.2 UX flow is Understand, Observe, Hypothesize, Test, Decide:
          Overview, System & Environment, Scorebook, Key Debates, Diagnostic, Simulator, Conclusion.
        </p>
      </Section>

      <Section title="Epistemic model">
        <div className="grid grid-4">
          <div className="card"><h3>Observed / derived</h3><p>Directly calculated from rows or observed in operating evidence.</p></div>
          <div className="card"><h3>Sourced</h3><p>Supported by external evidence or explicit references.</p></div>
          <div className="card"><h3>Endogenous assumption</h3><p>A company-controlled variable currently assumed by the user.</p></div>
          <div className="card"><h3>Exogenous assumption</h3><p>A market or environment variable largely outside company control.</p></div>
        </div>
      </Section>

      <Section title="Why Scorebook comes early">
        <div className="card">
          <p>
            The Lab asks users to inspect experience before scoring abstract dimensions.
            Scorebook rows show whether the system saw a case, made a decision, received human intervention,
            observed reality, and converted that reality into a grade.
          </p>
        </div>
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

      <Section title="Canonical tests">
        <div className="grid grid-2">
          <div className="card">
            <h3>Why five examples exist</h3>
            <p>
              The examples are a canonical test suite: positive test, boundary test, substitution/compression test,
              alternative Power test, and negative control. They are designed to expose where CE works, where it breaks,
              and where other forms of Power may dominate.
            </p>
          </div>
          <div className="card">
            <h3>Synthetic fixture policy</h3>
            <p>
              Real-company archetypes may frame the analysis, but bundled case rows are synthetic illustrative data.
              They test the theory and must not be treated as actual company operations.
            </p>
          </div>
        </div>
      </Section>

      <Section title="CaseSets and source systems">
        <div className="card">
          <p>
            CE is an analytical layer over experience produced by operating systems. The intended loop is:
            source system {"->"} run / experiment {"->"} CaseSet {"->"} CE analysis, with a return path back to the source system
            to change policy or assumptions and produce a new CaseSet.
          </p>
          <p>
            A CaseSet is not automatically a scorebook. It becomes scorebook-like only when it contains decisions,
            observed outcomes, meaningful grades, and enough provenance to connect learning back to the generating process.
          </p>
          <p className="small">
            Internal source links use a lightweight return context such as returnTo=compounding-expertise,
            analysisId, and caseSetId. Full production ingestion remains future work.
          </p>
        </div>
      </Section>

      <Section title="Structural model">
        <div className="card">
          <p>
            The Lab separates company identity, exogenous compounding opportunity, endogenous learning architecture,
            and competitive architecture. Useful learning is not automatically defensible learning.
          </p>
          <p>
            Cases preserve the sequence: context {"->"} agent decision {"->"} human intervention {"->"} action actually taken
            {"->"} outcome {"->"} grade. Action timestamps and source-record lineage are kept separate from decision and outcome
            timestamps so future source systems can link CE evidence back to operational records.
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

      <Section title="Deferred analytical layers">
        <div className="grid grid-2">
          <div className="card">
            <h3>Information theory / Shannon layer</h3>
            <p>Entropy, redundancy, marginal information gain, cross-customer transfer, knowledge compressibility, and decision-relevant value of information are future work.</p>
          </div>
          <div className="card">
            <h3>Autonomy frontier</h3>
            <p>Empirical decision classes, success/error distributions, downside risk, override value, evidence thresholds, and migration from expert-only to autonomous action are intentionally deferred.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
