/*
 * Guilloche: the fine interlaced linework printed on banknotes. Generated
 * parametrically (never hand-drawn path data) so it renders identically on
 * server and client.
 */

function ringPath(
  cx: number,
  cy: number,
  base: number,
  amp: number,
  lobes: number,
  phase: number,
  steps = 360,
) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = base + amp * Math.sin(lobes * t + phase);
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d + "Z";
}

/** A banknote-style rosette. Draw it large and faint. */
export function GuillocheRosette({
  className = "",
  rings = 28,
  lobes = 18,
  strokeWidth = 0.6,
}: {
  className?: string;
  rings?: number;
  lobes?: number;
  strokeWidth?: number;
}) {
  const paths: string[] = [];
  // Outer band of interlaced waves
  for (let i = 0; i < rings; i++) {
    paths.push(ringPath(300, 300, 222, 46, lobes, (i / rings) * Math.PI * 2));
  }
  // Inner band, counter-phased
  for (let i = 0; i < Math.round(rings * 0.6); i++) {
    paths.push(
      ringPath(300, 300, 118, 30, lobes / 2, (i / (rings * 0.6)) * Math.PI * 2),
    );
  }
  return (
    <svg
      viewBox="0 0 600 600"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
      <circle cx="300" cy="300" r="276" strokeWidth={strokeWidth * 1.5} />
      <circle cx="300" cy="300" r="282" />
    </svg>
  );
}

/** A horizontal guilloche band: phase-shifted sine lines. */
export function GuillocheBand({
  className = "",
  lines = 14,
  width = 1200,
  height = 80,
}: {
  className?: string;
  lines?: number;
  width?: number;
  height?: number;
}) {
  const paths: string[] = [];
  const steps = 240;
  for (let l = 0; l < lines; l++) {
    const phase = (l / lines) * Math.PI;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width;
      const y =
        height / 2 +
        (height / 2.6) * Math.sin((i / steps) * Math.PI * 10 + phase) *
          Math.cos((i / steps) * Math.PI * 2 - phase / 2);
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    paths.push(d);
  }
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={0.7}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
