export type StatusBand =
  | "healthy"
  | "watch"
  | "unhealthy"
  | "neutral"
  | "insufficient";

export function StatusDot({
  band,
  label
}: {
  band: StatusBand;
  label?: string;
}) {
  const ariaLabel = label ?? `Status: ${band}`;
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={`statusDot statusDot--${band}`}
    />
  );
}
