import type { DerivedDebateCandidate } from "./compounding-expertise-lab";

export type DebateSuggestionResult =
  | { status: "idle" }
  | { status: "success"; count: number }
  | { status: "error"; message: string };

export const DEBATE_REVIEW_SECTIONS = ["proposition", "position", "belief", "argument", "editor"] as const;
export type DebateReviewSection = typeof DEBATE_REVIEW_SECTIONS[number];
export type DebateReviewSnapshot = {
  family: string;
  title: string;
  sections: Record<DebateReviewSection, string>;
};

// Compare displayed content, not regenerated database IDs or provenance labels.
// Evidence panels are deliberately excluded: AI suggestions are not evidence.
export function debateReviewSnapshots(candidates: DerivedDebateCandidate[]): DebateReviewSnapshot[] {
  return candidates.map((candidate) => {
    const source = candidate.sourceDebate;
    return {
      family: candidate.family,
      title: candidate.title,
      sections: {
        proposition: candidate.proposition,
        position: JSON.stringify([candidate.investorBelief, candidate.investorBeliefDivergence]),
        belief: JSON.stringify([
          source?.increaseBelief || candidate.increaseBelief,
          source?.decreaseBelief || candidate.decreaseBelief
        ]),
        argument: JSON.stringify([source?.bullCase || "No bull case supplied yet.", source?.bearCase || "No bear case supplied yet."]),
        editor: JSON.stringify([
          source?.question ?? candidate.proposition,
          source?.bullCase ?? "",
          source?.bearCase ?? "",
          source?.evidenceNeeded ?? candidate.bestNextTest,
          source?.increaseBelief ?? candidate.increaseBelief,
          source?.decreaseBelief ?? candidate.decreaseBelief,
          source?.probability ?? candidate.investorBelief ?? 50
        ])
      }
    };
  });
}

export function changedDebateSections(before: DebateReviewSnapshot[], after: DebateReviewSnapshot[]) {
  const previous = new Map(before.map((debate) => [debate.family, debate]));
  return after.flatMap((debate) => {
    const old = previous.get(debate.family);
    const sections = DEBATE_REVIEW_SECTIONS.filter((section) => !old || old.sections[section] !== debate.sections[section]);
    return sections.length ? [{ family: debate.family, title: debate.title, isNew: !old, sections }] : [];
  });
}
