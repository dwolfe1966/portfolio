type TimingMark = {
  label: string;
  elapsedMs: number;
};

function timingEnabled() {
  return process.env.CE_TIMING === "1" || process.env.CE_TIMING === "true";
}

export function createScopedTimer(scope: string) {
  const enabled = timingEnabled();
  const startedAt = performance.now();
  let lastAt = startedAt;
  const marks: TimingMark[] = [];

  function mark(label: string) {
    if (!enabled) return;
    const now = performance.now();
    marks.push({ label, elapsedMs: now - lastAt });
    lastAt = now;
  }

  function end() {
    if (!enabled) return;
    const totalMs = performance.now() - startedAt;
    const detail = marks.map((item) => `${item.label}=${item.elapsedMs.toFixed(1)}ms`).join(" ");
    console.info(`[CE timing] ${scope} total=${totalMs.toFixed(1)}ms${detail ? ` ${detail}` : ""}`);
  }

  return { mark, end };
}
