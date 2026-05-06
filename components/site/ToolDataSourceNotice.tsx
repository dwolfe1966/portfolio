type ToolDataSourceNoticeProps = {
  datasetApplied?: string;
  datasetError?: string;
};

const errorMessages: Record<string, string> = {
  "dataset-not-found": "The selected dataset could not be found or does not match this tool.",
  "missing-dataset": "Choose an imported dataset before applying imported data.",
  "mutations-disabled": "Data switching is disabled in this environment."
};

export function ToolDataSourceNotice({ datasetApplied, datasetError }: ToolDataSourceNoticeProps) {
  if (!datasetApplied && !datasetError) return null;

  if (datasetError) {
    return (
      <div className="toolDataSourceNotice toolDataSourceNotice--error" role="status">
        <strong>Data source switch failed.</strong>
        <span>{errorMessages[datasetError] ?? "The selected data source could not be applied."}</span>
      </div>
    );
  }

  return (
    <div className="toolDataSourceNotice toolDataSourceNotice--success" role="status">
      <strong>Imported data is active.</strong>
      <span>The tool rows were replaced from the selected dataset snapshot and the counts below have refreshed.</span>
    </div>
  );
}
