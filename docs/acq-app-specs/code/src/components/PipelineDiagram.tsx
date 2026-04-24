// A simple wrapper component that displays a pipeline flowchart image.
// Place the final pipeline diagram image in your Next.js public/images folder
// and update the src path accordingly.  The diagram should illustrate how
// events become candidates, generate messages, and lead to outcomes.

export function PipelineDiagram() {
  return (
    <div className="flex justify-center">
      <img
        src="/images/pipeline.png"
        alt="Pipeline flow from events to outcomes"
        className="max-w-full h-auto"
      />
    </div>
  )
}
