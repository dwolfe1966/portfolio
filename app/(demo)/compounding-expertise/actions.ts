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
  actionKeyFromDecision,
  decisionClassKeyForCase,
  normalizedModelForExample,
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
    companyUrl: text(formData.get("companyUrl")) || null,
    productCategory: text(formData.get("productCategory")) || null,
    productDescription: text(formData.get("productDescription")),
    targetCustomer: text(formData.get("targetCustomer")),
    businessModel: text(formData.get("businessModel")) || null,
    workflow: text(formData.get("workflow")),
    decisionDescription: text(formData.get("decisionDescription")),
    actionSpace: text(formData.get("actionSpace")) || null,
    companyStage: text(formData.get("companyStage")) || null,
    thesis: text(formData.get("thesis")),
    economicCostWrongDecision: text(formData.get("economicCostWrongDecision")) || null,
    outcomeObjectivity: text(formData.get("outcomeObjectivity")) || null,
    naturalFeedbackTime: text(formData.get("naturalFeedbackTime")) || null,
    caseFrequency: text(formData.get("caseFrequency")) || null,
    customerCaseHeterogeneity: text(formData.get("customerCaseHeterogeneity")) || null,
    environmentalChangeRate: text(formData.get("environmentalChangeRate")) || null,
    foundationModelImprovementRate: text(formData.get("foundationModelImprovementRate")) || null,
    ownsDecisionPoint: text(formData.get("ownsDecisionPoint")) || null,
    controlsAction: text(formData.get("controlsAction")) || null,
    observesOutcome: text(formData.get("observesOutcome")) || null,
    capturesOverrides: text(formData.get("capturesOverrides")) || null,
    capturesGrades: text(formData.get("capturesGrades")) || null,
    learnsAcrossCustomers: text(formData.get("learnsAcrossCustomers")) || null,
    contractualLearningRights: text(formData.get("contractualLearningRights")) || null,
    runsControlledExperiments: text(formData.get("runsControlledExperiments")) || null,
    updatesModelPolicyRegularly: text(formData.get("updatesModelPolicyRegularly")) || null,
    deploysImprovementsQuickly: text(formData.get("deploysImprovementsQuickly")) || null,
    dataExclusivity: text(formData.get("dataExclusivity")) || null,
    workflowEmbeddedness: text(formData.get("workflowEmbeddedness")) || null,
    switchingCostsAssumption: text(formData.get("switchingCostsAssumption")) || null,
    rebuildability: text(formData.get("rebuildability")) || null,
    foundationModelDependence: text(formData.get("foundationModelDependence")) || null,
    deterministicInfrastructure: text(formData.get("deterministicInfrastructure")) || null,
    distributionAdvantage: text(formData.get("distributionAdvantage")) || null,
    regulatoryContractualBarriers: text(formData.get("regulatoryContractualBarriers")) || null
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
  const normalized = normalizedModelForExample(example);
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

    const profile = await tx.compoundingCompanyProfile.create({
      data: {
        analysisId: created.id,
        ...normalized.profile
      }
    });
    const workflow = await tx.compoundingWorkflow.create({
      data: {
        analysisId: created.id,
        companyProfileId: profile.id,
        name: normalized.workflow.name,
        description: normalized.workflow.description,
        position: normalized.workflow.position
      }
    });
    const stageIds = new Map<string, string>();
    for (const workflowStage of normalized.workflow.stages) {
      const savedStage = await tx.compoundingWorkflowStage.create({
        data: {
          workflowId: workflow.id,
          name: workflowStage.name,
          description: workflowStage.description,
          position: workflowStage.position,
          stageType: workflowStage.stageType
        }
      });
      stageIds.set(workflowStage.key, savedStage.id);
    }
    const decisionClassIds = new Map<string, string>();
    const actionIds = new Map<string, string>();
    for (const decisionClass of normalized.workflow.decisionClasses) {
      const savedDecisionClass = await tx.compoundingDecisionClass.create({
        data: {
          analysisId: created.id,
          workflowId: workflow.id,
          workflowStageId: decisionClass.stageKey ? stageIds.get(decisionClass.stageKey) ?? null : null,
          name: decisionClass.name,
          description: decisionClass.description,
          decisionMakerType: decisionClass.decisionMakerType,
          decisionFrequency: decisionClass.decisionFrequency,
          estimatedCasesPerPeriod: decisionClass.estimatedCasesPerPeriod,
          frequencyPeriod: decisionClass.frequencyPeriod,
          economicStakes: decisionClass.economicStakes,
          reversibility: decisionClass.reversibility,
          regulatoryRisk: decisionClass.regulatoryRisk,
          operationalRisk: decisionClass.operationalRisk,
          outcomeObservability: decisionClass.outcomeObservability,
          gradeObjectivity: decisionClass.gradeObjectivity,
          naturalFeedbackLatencyDays: decisionClass.naturalFeedbackLatencyDays,
          humanReviewMode: decisionClass.humanReviewMode,
          currentAutonomyMode: decisionClass.currentAutonomyMode
        }
      });
      decisionClassIds.set(decisionClass.key, savedDecisionClass.id);
      for (const action of normalized.workflow.actions.filter((item) => decisionClass.actionKeys.includes(item.key))) {
        const savedAction = await tx.compoundingDecisionAction.create({
          data: {
            decisionClassId: savedDecisionClass.id,
            key: action.key,
            label: action.label,
            description: action.description,
            reversible: action.reversible ?? "UNKNOWN",
            requiresHumanApproval: action.requiresHumanApproval ?? false,
            economicExposure: action.economicExposure,
            regulatoryExposure: action.regulatoryExposure
          }
        });
        actionIds.set(`${decisionClass.key}:${action.key}`, savedAction.id);
      }
    }
    await tx.compoundingEnvironment.create({ data: { analysisId: created.id, ...normalized.environment } });
    await tx.compoundingLearningArchitecture.create({ data: { analysisId: created.id, ...normalized.learningArchitecture } });
    await tx.compoundingCompetitiveArchitecture.create({ data: { analysisId: created.id, ...normalized.competitiveArchitecture } });

    const caseSet = caseSetForExample(example);
    const caseSetDecisionClassId = normalized.workflow.decisionClasses.length === 1
      ? decisionClassIds.get(normalized.workflow.decisionClasses[0].key) ?? null
      : null;
    await tx.compoundingExpertiseCaseSet.create({
      data: {
        id: caseSetId,
        analysisId: created.id,
        workflowId: workflow.id,
        decisionClassId: caseSetDecisionClassId,
        ...caseSet
      }
    });
    await tx.compoundingExpertiseCase.createMany({
      data: example.cases.map((row) => {
        const decisionClassKey = decisionClassKeyForCase(example, row);
        const decisionClassId = decisionClassIds.get(decisionClassKey) ?? caseSetDecisionClassId;
        const scopedActionId = (value: string | null | undefined) => {
          const key = actionKeyFromDecision(value);
          return actionIds.get(`${decisionClassKey}:${key}`) ?? null;
        };
        return {
          ...row,
          analysisId: created.id,
          caseSetId,
          decisionClassId,
          agentDecisionActionId: scopedActionId(row.agentDecision),
          humanDecisionActionId: scopedActionId(row.humanDecision),
          actionTakenActionId: scopedActionId(row.actionTaken),
          decisionAt: nullableDate(row.decisionAt instanceof Date ? row.decisionAt.toISOString() : row.decisionAt ?? null),
          actionAt: nullableDate(row.actionAt instanceof Date ? row.actionAt.toISOString() : row.actionAt ?? null),
          outcomeAt: nullableDate(row.outcomeAt instanceof Date ? row.outcomeAt.toISOString() : row.outcomeAt ?? null)
        };
      })
    });
    for (const evidence of normalized.evidence) {
      const entityId = evidence.entityType === "company_profile"
        ? profile.id
        : evidence.entityType === "workflow"
          ? workflow.id
          : evidence.entityType === "case_set"
            ? caseSetId
            : evidence.entityType === "environment"
              ? created.id
              : evidence.entityType === "decision_class" && evidence.entityKey
                ? decisionClassIds.get(evidence.entityKey) ?? null
                : null;
      await tx.compoundingEvidence.create({
        data: {
          analysisId: created.id,
          entityType: evidence.entityType,
          entityId,
          fieldKey: evidence.fieldKey,
          evidenceType: evidence.evidenceType,
          epistemicStatus: evidence.epistemicStatus,
          valueSnapshot: evidence.valueSnapshot,
          sourceLabel: evidence.sourceLabel,
          sourceUrl: evidence.sourceUrl,
          sourceRecordId: evidence.sourceRecordId,
          sourceCaseSetId: evidence.sourceCaseSetKey === "canonical_case_set" ? caseSetId : null,
          confidence: evidence.confidence,
          observedAt: nullableDate(evidence.observedAt instanceof Date ? evidence.observedAt.toISOString() : evidence.observedAt ?? null),
          derivationMethod: evidence.derivationMethod,
          analystNotes: evidence.analystNotes
        }
      });
    }
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
      actionAt: nullableDate(formData.getAll("actionAt")[index] ?? null),
      outcomeAt: nullableDate(formData.getAll("outcomeAt")[index] ?? null),
      isEdgeCase: text(formData.getAll("isEdgeCase")[index] ?? null) === "1",
      isSynthetic: text(formData.getAll("isSynthetic")[index] ?? null) !== "0",
      sourceLabel: text(formData.getAll("sourceLabel")[index] ?? null) || "User-entered scorebook row",
      sourceRecordId: nullableText(formData.getAll("sourceRecordId")[index] ?? null),
      sourceRecordType: nullableText(formData.getAll("sourceRecordType")[index] ?? null),
      sourceRecordRoute: nullableText(formData.getAll("sourceRecordRoute")[index] ?? null),
      notes: nullableText(formData.getAll("notes")[index] ?? null)
    };

    if (id) await db.compoundingExpertiseCase.update({ where: { id }, data });
    else await db.compoundingExpertiseCase.create({ data });
  }

  revalidateLab();
  redirect(`/compounding-expertise/debates${caseSetIds.find(Boolean) ? `?caseSetId=${caseSetIds.find(Boolean)}` : ""}`);
}

export async function saveCaseSetAction(formData: FormData) {
  const analysisId = text(formData.get("analysisId"));
  if (!analysisId) redirect("/compounding-expertise/inputs");

  const caseSetId = text(formData.get("caseSetId"));
  const data = {
    analysisId,
    name: text(formData.get("name")) || "Untitled CaseSet",
    description: nullableText(formData.get("description")),
    sourceType: text(formData.get("sourceType")) || "MANUAL",
    sourceSystemKey: nullableText(formData.get("sourceSystemKey")),
    sourceSystemLabel: nullableText(formData.get("sourceSystemLabel")),
    sourceRunId: nullableText(formData.get("sourceRunId")),
    sourceRunLabel: nullableText(formData.get("sourceRunLabel")),
    sourceRunType: nullableText(formData.get("sourceRunType")),
    sourceRoute: nullableText(formData.get("sourceRoute")),
    sourceExternalUrl: nullableText(formData.get("sourceExternalUrl")),
    modelVersion: nullableText(formData.get("modelVersion")),
    policyVersion: nullableText(formData.get("policyVersion")),
    experimentId: nullableText(formData.get("experimentId")),
    timeWindowStart: nullableDate(formData.get("timeWindowStart")),
    timeWindowEnd: nullableDate(formData.get("timeWindowEnd")),
    isSynthetic: text(formData.get("isSynthetic")) === "1",
    provenanceLabel: text(formData.get("provenanceLabel")) || "User-entered CaseSet",
    parentCaseSetId: nullableText(formData.get("parentCaseSetId")),
    derivationDescription: nullableText(formData.get("derivationDescription"))
  };

  const saved = caseSetId
    ? await db.compoundingExpertiseCaseSet.update({ where: { id: caseSetId }, data })
    : await db.compoundingExpertiseCaseSet.create({ data });

  revalidateLab();
  redirect(`/compounding-expertise/scorebook?caseSetId=${saved.id}`);
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
