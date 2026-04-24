import React from "react";

/**
 * A type describing a single variable definition. Each variable belongs to either
 * the `input` or `output` category and includes a human‑readable description.
 * An optional example helps users understand the value format. The generic
 * signature allows you to extend the shape with additional metadata later
 * without having to change the component implementation.
 */
export interface VariableDefinition {
  /**
   * The unique name of the variable as it appears in the engine. This should
   * correspond to keys used in your backend models (e.g. `interestScore`).
   */
  name: string;
  /**
   * The primitive type of the variable (e.g. number, string, enum). This is
   * informational only and can be used by the UI for styling or validation.
   */
  type: string;
  /**
   * Whether this variable is an input (set by the user or simulation) or an
   * output (computed by the system). Use this flag to group definitions in
   * the rendered panel.
   */
  category: "input" | "output";
  /**
   * A plain‑English description of what the variable represents and how it
   * influences the model. Keep this succinct – long explanations belong in
   * contextual help or documentation.
   */
  description: string;
  /**
   * An optional example value that illustrates what a typical entry might
   * look like. This helps users orient themselves when scanning the list.
   */
  example?: string;
}

export interface VariableDefinitionsProps {
  /**
   * A list of variable definitions to display. The component will group
   * variables by their category and render them under separate headings.
   */
  definitions: VariableDefinition[];
  /**
   * An optional title to display above the definitions. Provide this when the
   * component appears on its own page; omit it when embedding into another
   * panel that already has a heading.
   */
  title?: string;
}

/**
 * The `VariableDefinitions` component renders a two‑column list of input and
 * output variables with names, types, descriptions, and example values. It
 * groups variables by category and adds headings for clarity. Use this
 * component in the lifecycle demo to ensure users understand all inputs,
 * outputs, and control variables. The design intentionally avoids long
 * paragraphs; definitions should be concise and scannable. For a deeper
 * explanation of each variable, consider linking to separate docs or
 * tooltips.
 */
export function VariableDefinitions({ definitions, title }: VariableDefinitionsProps) {
  // Derive grouped lists of inputs and outputs for rendering. If no
  // definitions are provided, default to empty arrays to avoid runtime
  // errors.
  const inputs = React.useMemo(
    () => definitions.filter((def) => def.category === "input"),
    [definitions]
  );
  const outputs = React.useMemo(
    () => definitions.filter((def) => def.category === "output"),
    [definitions]
  );

  return (
    <section className="variable-definitions">
      {title && <h2 className="mb-4 text-2xl font-bold">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-2">Input Variables</h3>
          {inputs.length === 0 ? (
            <p className="text-gray-500">No input variables defined.</p>
          ) : (
            <ul className="space-y-4">
              {inputs.map((def) => (
                <li key={def.name} className="border p-4 rounded-md shadow-sm bg-white">
                  <div className="font-medium text-gray-900">
                    {def.name} <span className="text-sm text-gray-500">({def.type})</span>
                  </div>
                  <p className="text-gray-700 text-sm mt-1">{def.description}</p>
                  {def.example && (
                    <p className="text-gray-500 text-xs mt-1">
                      Example: <code>{def.example}</code>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">Output Variables</h3>
          {outputs.length === 0 ? (
            <p className="text-gray-500">No output variables defined.</p>
          ) : (
            <ul className="space-y-4">
              {outputs.map((def) => (
                <li key={def.name} className="border p-4 rounded-md shadow-sm bg-white">
                  <div className="font-medium text-gray-900">
                    {def.name} <span className="text-sm text-gray-500">({def.type})</span>
                  </div>
                    <p className="text-gray-700 text-sm mt-1">{def.description}</p>
                    {def.example && (
                      <p className="text-gray-500 text-xs mt-1">
                        Example: <code>{def.example}</code>
                      </p>
                    )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}