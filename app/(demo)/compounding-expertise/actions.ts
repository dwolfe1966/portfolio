"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ALL_DIMENSIONS,
  DEFAULT_SCENARIOS,
  INITIAL_DEBATES,
  SYNTHETIC_CLAIMS_EXAMPLE,
  SYNTHETIC_DEBATES,
  defaultAssessments,
  normalizeAssessment,
  sanitizeScenario,
  validateProbability,
  type CompoundingConfidence,
  type CompoundingDebateSource,
  type CompoundingEvidenceStatus,
  type CompoundingFramework,
  type CompanyThesisInput,
  type DimensionAssessmentInput,
  type SimulationScenarioInput
} from "@/lib/compounding-expertise-lab";
import { generateCompoundingExpertiseDebates } from "@/lib/compounding-expertise-ai";
import { db } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";
import { currentAccountUserId } from "./data";

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function numberValue(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function intValue(value: FormDataEntryValue | null, fallback = 0) {
  return Math.round(numberValue(value, fallback));
}

function analysisInput(formData: FormData): CompanyThesisInput {
  return {
    companyName: text(formData.get("companyName")) || "Untitled analysis",
    productDescription: text(formData.get("productDescription")),
    targetCustomer: text(formData.get("targetCustomer")),
    workflow: text(formData.get("workflow")),
    decisionDescription: text(formData.get("decisionDescription")),
    thesis: text(formData.get("thesis"))
  };
}

async function createAnalysis(input: CompanyThesisInput, accountUserId: string | null) {
  const workspace = await getDefaultWorkspace();
  return db.compoundingExpertiseAnalysis.create({
    data: {
      workspaceId: workspace.id,
      accountUserId,
      ...input,
      keyDebates: {
        create: INITIAL_DEBATES.map((debate) => ({
          question: debate.question,
          bullCase: debate.bullCase,
          bearCase: debate.bearCase,
          evidenceNeeded: debate.evidenceNeeded,
          increaseBelief: debate.increaseBelief,
          decreaseBelief: debate.decreaseBelief,
          probability: debate.probability,
          source: debate.source
        }))
      },
      dimensionAssessments: {
        create: defaultAssessments().map((assessment) => normalizeAssessment(assessment))
      },
      simulationScenarios: {
        create: DEFAULT_SCENARIOS.map((scenario) => sanitizeScenario(scenario))
      }
    }
  });
}

async function ensureAnalysisDefaults(analysisId: string) {
  const [assessmentCount, scenarioCount, debateCount] = await Promise.all([
    db.compoundingExpertiseDimensionAssessment.count({ where: { analysisId } }),
    db.compoundingExpertiseSimulationScenario.count({ where: { analysisId } }),
    db.compoundingExpertiseKeyDebate.count({ where: { analysisId } })
  ]);

  if (assessmentCount === 0) {
    await db.compoundingExpertiseDimensionAssessment.createMany({
      data: defaultAssessments().map((assessment) => ({ analysisId, ...normalizeAssessment(assessment) }))
    });
  }
  if (scenarioCount === 0) {
    await db.compoundingExpertiseSimulationScenario.createMany({
      data: DEFAULT_SCENARIOS.map((scenario) => ({ analysisId, ...sanitizeScenario(scenario) }))
    });
  }
  if (debateCount === 0) {
    await db.compoundingExpertiseKeyDebate.createMany({
      data: INITIAL_DEBATES.map((debate) => ({ analysisId, ...debate }))
    });
  }
}

function revalidateLab() {
  [
    "/compounding-expertise/overview",
    "/compounding-expertise/inputs",
    "/compounding-expertise/debates",
    "/compounding-expertise/diagnostic",
    "/compounding-expertise/simulator",
    "/compounding-expertise/memo"
  ].forEach((path) => revalidatePath(path));
}

export async function saveAnalysisAction(formData: FormData) {
  const accountUserId = await currentAccountUserId();
  const id = text(formData.get("analysisId"));
  const input = analysisInput(formData);

  const analysis = id
    ? await db.compoundingExpertiseAnalysis.update({
        where: { id },
        data: input
      })
    : await createAnalysis(input, accountUserId);

  await ensureAnalysisDefaults(analysis.id);
  revalidateLab();
  redirect("/compounding-expertise/debates");
}

export async function loadSyntheticExampleAction() {
  const accountUserId = await currentAccountUserId();
  const workspace = await getDefaultWorkspace();
  const analysis = await db.compoundingExpertiseAnalysis.create({
    data: {
      workspaceId: workspace.id,
      accountUserId,
      ...SYNTHETIC_CLAIMS_EXAMPLE,
      keyDebates: {
        create: SYNTHETIC_DEBATES.map((debate) => ({ ...debate, source: debate.source }))
      },
      dimensionAssessments: {
        create: defaultAssessments().map((assessment) => normalizeAssessment({
          ...assessment,
          rationale: "Synthetic example starts without evidence. Edit this assessment before treating it as observed or sourced.",
          evidenceStatus: "UNKNOWN"
        }))
      },
      simulationScenarios: {
        create: DEFAULT_SCENARIOS.map((scenario) => sanitizeScenario(scenario))
      }
    }
  });

  revalidateLab();
  redirect(`/compounding-expertise/inputs?analysisId=${analysis.id}&example=synthetic`);
}

export async function saveDebatesAction(formData: FormData) {
  const analysisId = text(formData.get("analysisId"));
  if (!analysisId) redirect("/compounding-expertise/inputs");

  const debateIds = formData.getAll("debateId").map((value) => text(value));
  const questions = formData.getAll("question").map((value) => text(value));
  const bullCases = formData.getAll("bullCase").map((value) => text(value));
  const bearCases = formData.getAll("bearCase").map((value) => text(value));
  const evidenceNeeded = formData.getAll("evidenceNeeded").map((value) => text(value));
  const increaseBelief = formData.getAll("increaseBelief").map((value) => text(value));
  const decreaseBelief = formData.getAll("decreaseBelief").map((value) => text(value));
  const probabilities = formData.getAll("probability").map((value) => intValue(value, 50));
  const sources = formData.getAll("source").map((value) => text(value) as CompoundingDebateSource);

  for (let index = 0; index < questions.length; index++) {
    if (!questions[index]) continue;
    const probability = validateProbability(probabilities[index]).ok ? probabilities[index] : 50;
    const data = {
      analysisId,
      question: questions[index],
      bullCase: bullCases[index] ?? "",
      bearCase: bearCases[index] ?? "",
      evidenceNeeded: evidenceNeeded[index] ?? "",
      increaseBelief: increaseBelief[index] ?? "",
      decreaseBelief: decreaseBelief[index] ?? "",
      probability,
      source: ["SUN", "WOLFE", "USER", "AI"].includes(sources[index]) ? sources[index] : "USER"
    };
    if (debateIds[index]) {
      await db.compoundingExpertiseKeyDebate.update({ where: { id: debateIds[index] }, data });
    } else {
      await db.compoundingExpertiseKeyDebate.create({ data });
    }
  }

  revalidateLab();
  redirect("/compounding-expertise/diagnostic");
}

export async function generateDebatesAction(formData: FormData) {
  const analysisId = text(formData.get("analysisId"));
  if (!analysisId) redirect("/compounding-expertise/inputs");
  const analysis = await db.compoundingExpertiseAnalysis.findUnique({ where: { id: analysisId } });
  if (!analysis) redirect("/compounding-expertise/inputs");

  const result = await generateCompoundingExpertiseDebates(analysis);
  await db.compoundingExpertiseKeyDebate.deleteMany({ where: { analysisId } });
  await db.compoundingExpertiseKeyDebate.createMany({
    data: result.debates.map((debate) => ({
      analysisId,
      question: debate.question,
      bullCase: debate.bullCase,
      bearCase: debate.bearCase,
      evidenceNeeded: debate.evidenceNeeded,
      increaseBelief: debate.increaseBelief,
      decreaseBelief: debate.decreaseBelief,
      probability: debate.probability,
      source: result.ok ? "AI" : debate.source
    }))
  });

  revalidateLab();
  redirect(`/compounding-expertise/debates?ai=${result.ok ? "generated" : "fallback"}`);
}

export async function saveDiagnosticAction(formData: FormData) {
  const analysisId = text(formData.get("analysisId"));
  if (!analysisId) redirect("/compounding-expertise/inputs");

  const ids = formData.getAll("assessmentId").map((value) => text(value));
  const frameworks = formData.getAll("framework").map((value) => text(value) as CompoundingFramework);
  const dimensions = formData.getAll("dimension").map((value) => text(value));
  const scores = formData.getAll("score").map((value) => intValue(value, 0));
  const confidences = formData.getAll("confidence").map((value) => text(value) as CompoundingConfidence);
  const rationales = formData.getAll("rationale").map((value) => text(value));
  const evidenceStatuses = formData.getAll("evidenceStatus").map((value) => text(value) as CompoundingEvidenceStatus);

  for (let index = 0; index < dimensions.length; index++) {
    const assessment: DimensionAssessmentInput = normalizeAssessment({
      framework: frameworks[index],
      dimension: dimensions[index],
      score: scores[index],
      confidence: confidences[index],
      rationale: rationales[index] ?? "",
      evidenceStatus: evidenceStatuses[index],
      source: "USER"
    });
    const data = { analysisId, ...assessment };
    if (ids[index]) await db.compoundingExpertiseDimensionAssessment.update({ where: { id: ids[index] }, data });
    else await db.compoundingExpertiseDimensionAssessment.create({ data });
  }

  revalidateLab();
  redirect("/compounding-expertise/simulator");
}

export async function saveScenariosAction(formData: FormData) {
  const analysisId = text(formData.get("analysisId"));
  if (!analysisId) redirect("/compounding-expertise/inputs");
  const ids = formData.getAll("scenarioId").map((value) => text(value));
  const names = formData.getAll("name").map((value) => text(value));

  for (let index = 0; index < names.length; index++) {
    const scenario: SimulationScenarioInput = sanitizeScenario({
      name: names[index],
      startingCases: intValue(formData.getAll("startingCases")[index] ?? null, 0),
      casesPerMonth: numberValue(formData.getAll("casesPerMonth")[index] ?? null, 0),
      feedbackDelayDays: intValue(formData.getAll("feedbackDelayDays")[index] ?? null, 0),
      transferability: numberValue(formData.getAll("transferability")[index] ?? null, 0),
      informationValue: numberValue(formData.getAll("informationValue")[index] ?? null, 0),
      learningEfficiency: numberValue(formData.getAll("learningEfficiency")[index] ?? null, 0),
      stalenessRate: numberValue(formData.getAll("stalenessRate")[index] ?? null, 0),
      baseCapability: numberValue(formData.getAll("baseCapability")[index] ?? null, 0)
    });
    const data = { analysisId, ...scenario };
    if (ids[index]) await db.compoundingExpertiseSimulationScenario.update({ where: { id: ids[index] }, data });
    else await db.compoundingExpertiseSimulationScenario.create({ data });
  }

  revalidateLab();
  redirect("/compounding-expertise/memo");
}
