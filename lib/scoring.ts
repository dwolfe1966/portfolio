export type Segment = "FREE" | "TRIAL" | "LAPSED" | "ACTIVE";
export type ChangeType =
  | "ADDRESS_CHANGE"
  | "PHONE_ADDED"
  | "PHONE_CHANGED"
  | "EMAIL_ADDED"
  | "ASSOCIATE_ADDED"
  | "LEGAL_RECORD_ADDED";

const segmentWeights: Record<Segment, number> = {
  FREE: 0.6,
  TRIAL: 0.8,
  LAPSED: 0.95,
  ACTIVE: 0.35
};

const changeWeights: Record<ChangeType, number> = {
  ADDRESS_CHANGE: 0.6,
  PHONE_ADDED: 0.7,
  PHONE_CHANGED: 0.75,
  EMAIL_ADDED: 0.65,
  ASSOCIATE_ADDED: 0.5,
  LEGAL_RECORD_ADDED: 0.95
};

const INTEREST_WEIGHT = 0.45;
const SEGMENT_WEIGHT = 0.25;
const CHANGE_WEIGHT = 0.15;
const RECENCY_WEIGHT = 0.15;

export function calculatePriorityScore(args: {
  interestScore: number;
  segment: Segment;
  changeType: ChangeType;
  recencyScore: number;
}) {
  return calculatePriorityBreakdown(args).totalScore;
}

export function calculatePriorityBreakdown(args: {
  interestScore: number;
  segment: Segment;
  changeType: ChangeType;
  recencyScore: number;
}) {
  const { interestScore, segment, changeType, recencyScore } = args;
  const interestContribution = interestScore * INTEREST_WEIGHT;
  const segmentContribution = segmentWeights[segment] * SEGMENT_WEIGHT;
  const changeTypeContribution = changeWeights[changeType] * CHANGE_WEIGHT;
  const recencyContribution = recencyScore * RECENCY_WEIGHT;
  const totalScore = interestContribution + segmentContribution + changeTypeContribution + recencyContribution;

  return {
    totalScore,
    interestContribution,
    segmentContribution,
    changeTypeContribution,
    recencyContribution
  };
}
