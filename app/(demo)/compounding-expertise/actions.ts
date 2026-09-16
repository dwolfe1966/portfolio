"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ALL_DIMENSIONS,
  DEFAULT_SCENARIOS,
  INITIAL_DEBATES,
  defaultAssessments,
  exampleById,
  normalizeAssessment,
  sanitizeScenario,
  scorebookDerivedSimulatorValues,
  calculateScorebookMetrics,
  caseSetForExample,
  validateProbability,
  type CompoundingCaseGrade,
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

function nullableText(value: FormDataEntryValue | null) {
  const resolved = text(value);
  return resolved || null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const resolved = text(value);
  if (!resolved) return null;
  const parsed = Number(resolved);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableDate(value: FormDataEntryValue | null) {
  const resolved = text(value);
  if (!resolved) return null;
  const parsed = new Date(resolved);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function analysisInput(formData: FormData): CompanyThesisInput {
  return {
    companyName: text(formData.get("companyName")) || "Untitled analysis",
    productDescription: text(formData.get("productDescription")),
    targetCustomer: text(formData.get("targetCustomer")),
    workflow: text(formData.get("workflow")),
    decisionDescription: text(formData.get("decisionDescription")),
    thesis: text(formData.get("thesis")),
    economicCostWrongDecision: text(formData.get("economicCostWrongDecision")) || null,
    outcomeObjectivity: text(formData.get("outcomeObjectivity")) || null,
    naturalFeedbackTime: text(formData.get("naturalFeedbackTime")) || null,
    customerCaseHeterogeneity: text(formData.get("customerCaseHeterogeneity")) || null,
    environmentalChangeRate: text(formData.get("environmentalChangeRate")) || null,
    foundationModelImprovementRate: text(formData.get("foundationModelImprovementRate")) || null,
    ownsDecisionPoint: text(formData.get("ownsDecisionPoint")) || null,
    observesOutcome: text(formData.get("observesOutcome")) || null,
    capturesOverrides: text(formData.get("capturesOverrides")) || null,
    capturesGrades: text(formData.get("capturesGrades")) || null,
    learnsAcrossCustomers: text(formData.get("learnsAcrossCustomers")) || null,
    contractualLearningRights: text(formData.get("contractualLearningRights")) || null,
    runsControlledExperiments: text(formData.get("runsControlledExperiments")) || null,
    updatesModelPolicyRegularly: text(formData.get("updatesModelPolicyRegularly")) || null,
    deploysImprovementsQuickly: text(formData.get("deploysImprovementsQuickly")) || null
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
    "/compounding-expertise/scorebook",
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
  redirect("/compounding-expertise/scorebook");
}

export async function loadSyntheticExampleAction(formData?: FormData) {
  const accountUserId = await currentAccountUserId();
  const workspace = await getDefaultWorkspace();
  const example = exampleById(formData ? text(formData.get("exampleId")) : "casap");
  const caseSetId = randomUUID();
  const analysis = await db.$transaction(async (tx) => {
    const created = await tx.compoundingExpertiseAnalysis.create({
      data: {
        workspaceId: workspace.id,
        accountUserId,
        ...example.analysis,
        keyDebates: {
          create: example.debates.map((debate) => ({ ...debate, source: debate.source }))
        },
        dimensionAssessments: {
          create: defaultAssessments().map((assessment) => normalizeAssessment({
            ...assessment,
            rationale: "Example analysis starts without evidence. Synthetic case rows are illustrative fixtures, not company data.",
            evidenceStatus: "UNKNOWN"
          }))
        },
        simulationScenarios: {
          create: example.scenarios.map((scenario) => sanitizeScenario(scenario))
        }
      }
    });

    const caseSet = caseSetForExample(example);
    await tx.compoundingExpertiseCaseSet.create({
      data: {
        id: caseSetId,
        analysisId: created.id,
        ...caseSet
      }
    });
    await tx.compoundingExpertiseCase.createMany({
      data: example.cases.map((row) => ({
        ...row,
        analysisId: created.id,
        caseSetId,
        decisionAt: nullableDate(row.decisionAt instanceof Date ? row.decisionAt.toISOString() : row.decisionAt ?? null),
        outcomeAt: nullableDate(row.outcomeAt instanceof Date ? row.outcomeAt.toISOString() : row.outcomeAt ?? null)
      }))
    });
    return created;
  });

  revalidateLab();
  redirect(`/compounding-expertise/inputs?analysisId=${analysis.id}&example=${example.id}`);
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
  const analysis = await db.compoundingExpertiseAnalysis.findUnique({
    where: { id: analysisId },
    include: { scorebookCases: true }
  });
  if (!analysis) redirect("/compounding-expertise/inputs");

  const metrics = calculateScorebookMetrics(analysis.scorebookCases);
  const result = await generateCompoundingExpertiseDebates(analysis, {
    exogenous: {
      economicCostWrongDecision: analysis.economicCostWrongDecision,
      outcomeObjectivity: analysis.outcomeObjectivity,
      naturalFeedbackTime: analysis.naturalFeedbackTime,
      customerCaseHeterogeneity: analysis.customerCaseHeterogeneity,
      environmentalChangeRate: analysis.environmentalChangeRate,
      foundationModelImprovementRate: analysis.foundationModelImprovementRate
    },
    endogenous: {
      ownsDecisionPoint: analysis.ownsDecisionPoint,
      observesOutcome: analysis.observesOutcome,
      capturesOverrides: analysis.capturesOverrides,
      capturesGrades: analysis.capturesGrades,
      learnsAcrossCustomers: analysis.learnsAcrossCustomers,
      contractualLearningRights: analysis.contractualLearningRights,
      runsControlledExperiments: analysis.runsControlledExperiments,
      updatesModelPolicyRegularly: analysis.updatesModelPolicyRegularly,
      deploysImprovementsQuickly: analysis.deploysImprovementsQuickly
    },
    scorebookSummary: metrics
  });
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

export async function saveScorebookAction(formData: FormData) {
  const analysisId = text(formData.get("analysisId"));
  if (!analysisId) redirect("/compounding-expertise/inputs");

  const ids = formData.getAll("caseId").map((value) => text(value));
  const caseSetIds = formData.getAll("caseSetId").map((value) => nullableText(value));
  const deleteFlags = formData.getAll("deleteCase").map((value) => text(value));
  const externalCaseIds = formData.getAll("externalCaseId").map((value) => text(value));

  for (let index = 0; index < externalCaseIds.length; index++) {
    const id = ids[index];
    if (id && deleteFlags[index] === "1") {
      await db.compoundingExpertiseCase.delete({ where: { id } }).catch(() => null);
      continue;
    }

    const requiredAny = [
      externalCaseIds[index],
      text(formData.getAll("customerSegment")[index] ?? null),
      text(formData.getAll("caseType")[index] ?? null),
      text(formData.getAll("context")[index] ?? null),
      text(formData.getAll("agentDecision")[index] ?? null)
    ].some(Boolean);
    if (!id && !requiredAny) continue;

    const grade = text(formData.getAll("grade")[index] ?? null) as CompoundingCaseGrade;
    const caseSetId = caseSetIds[index];
    const data = {
      analysisId,
      caseSetId,
      externalCaseId: externalCaseIds[index] || `case-${index + 1}`,
      customerSegment: text(formData.getAll("customerSegment")[index] ?? null) || "Unknown",
      caseType: text(formData.getAll("caseType")[index] ?? null) || "Unknown",
      context: text(formData.getAll("context")[index] ?? null),
      agentDecision: text(formData.getAll("agentDecision")[index] ?? null),
      agentConfidence: nullableNumber(formData.getAll("agentConfidence")[index] ?? null),
      humanDecision: nullableText(formData.getAll("humanDecision")[index] ?? null),
      humanOverride: text(formData.getAll("humanOverride")[index] ?? null) === "1",
      actionTaken: nullableText(formData.getAll("actionTaken")[index] ?? null),
      outcome: nullableText(formData.getAll("outcome")[index] ?? null),
      outcomeValue: nullableNumber(formData.getAll("outcomeValue")[index] ?? null),
      grade: ["CORRECT", "PARTIALLY_CORRECT", "INCORRECT", "UNRESOLVED"].includes(grade) ? grade : "UNRESOLVED",
      gradeConfidence: nullableNumber(formData.getAll("gradeConfidence")[index] ?? null),
      decisionAt: nullableDate(formData.getAll("decisionAt")[index] ?? null),
      outcomeAt: nullableDate(formData.getAll("outcomeAt")[index] ?? null),
      isEdgeCase: text(formData.getAll("isEdgeCase")[index] ?? null) === "1",
      isSynthetic: text(formData.getAll("isSynthetic")[index] ?? null) !== "0",
      sourceLabel: text(formData.getAll("sourceLabel")[index] ?? null) || "User-entered scorebook row",
      notes: nullableText(formData.getAll("notes")[index] ?? null)
    };

    if (id) await db.compoundingExpertiseCase.update({ where: { id }, data });
    else await db.compoundingExpertiseCase.create({ data });
  }

  revalidateLab();
  redirect(`/compounding-expertise/debates${caseSetIds.find(Boolean) ? `?caseSetId=${caseSetIds.find(Boolean)}` : ""}`);
}

export async function applyScorebookDerivedValuesAction(formData: FormData) {
  const analysisId = text(formData.get("analysisId"));
  const caseSetId = nullableText(formData.get("caseSetId"));
  if (!analysisId) redirect("/compounding-expertise/inputs");

  const [cases, scenarios] = await Promise.all([
    db.compoundingExpertiseCase.findMany({ where: { analysisId, ...(caseSetId ? { caseSetId } : {}) } }),
    db.compoundingExpertiseSimulationScenario.findMany({ where: { analysisId }, orderBy: { name: "asc" } })
  ]);
  const derived = scorebookDerivedSimulatorValues(cases);
  const target = scenarios[0];
  if (target) {
    await db.compoundingExpertiseSimulationScenario.update({
      where: { id: target.id },
      data: {
        startingCases: derived.startingGradedCases,
        feedbackDelayDays: derived.feedbackDelayDays === null ? target.feedbackDelayDays : Math.round(derived.feedbackDelayDays)
      }
    });
  }

  revalidateLab();
  redirect("/compounding-expertise/simulator?scorebook=applied");
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
