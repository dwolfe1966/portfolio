import { currentAccountUserId, loadCompoundingAnalysis } from "@/app/(demo)/compounding-expertise/data";
import { resolveExperienceContext } from "@/lib/experience-context";
import { createExperienceRun } from "@/lib/experience-run";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const analysisId = query.get("analysisId");
  if (!analysisId) return Response.json({ error: "Analysis is required." }, { status: 400 });
  const analysis = await loadCompoundingAnalysis(await currentAccountUserId(), analysisId);
  if (!analysis) return Response.json({ error: "Analysis unavailable." }, { status: 404 });
  const runId = query.get("runId");
  if (runId) {
    const saved = analysis.evidenceRecords.find(item => item.evidenceType === "ANALYSIS_RUN" && item.sourceRecordId === runId);
    if (!saved?.valueSnapshot) return Response.json({ error: "Saved run unavailable." }, { status: 404 });
    return new Response(saved.valueSnapshot, { headers: { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=experience-analysis-saved.json", "Cache-Control": "private, no-store" } });
  }
  try {
    const context = resolveExperienceContext(analysis, analysis.scorebookCases, { caseSetId: query.get("caseSetId"), dataset: query.get("dataset") });
    const run = createExperienceRun(context.activeRows, { analysisId, datasetKey: context.selected.caseSetId ?? context.selected.datasetKey, datasetName: context.selected.name, provenance: context.selected.provenanceLabel });
    return new Response(JSON.stringify(run, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="experience-analysis-${run.revision.slice(0, 12)}.json"`, "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Selected dataset unavailable. Re-select it in Experience." }, { status: 400 });
  }
}
