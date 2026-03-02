export const NO_DATA_COLOR = "#9ca3af"

export const FOUR_STEP_COLORS = [
  "#c8e6c9",
  "#81c784",
  "#4caf50",
  "#2e7d32",
]

export function getFourStepScale(
  values: number[]
): { breaks: [number, number, number, number]; colors: string[] } {
  const sorted = [...values].filter((v) => v >= 0).sort((a, b) => a - b)
  const n = sorted.length
  if (n === 0) {
    return {
      breaks: [0, 0, 0, 0],
      colors: FOUR_STEP_COLORS,
    }
  }
  const q1 = sorted[Math.floor(n * 0.25)] ?? sorted[0]
  const q2 = sorted[Math.floor(n * 0.5)] ?? sorted[0]
  const q3 = sorted[Math.floor(n * 0.75)] ?? sorted[n - 1]
  const min = sorted[0] ?? 0
  return {
    breaks: [min, q1, q2, q3],
    colors: FOUR_STEP_COLORS,
  }
}

export function getStepIndex(value: number, breaks: [number, number, number, number]): number {
  const [, q1, q2, q3] = breaks
  if (value <= q1) return 0
  if (value <= q2) return 1
  if (value <= q3) return 2
  return 3
}

export function getFourStepLabels(breaks: [number, number, number, number]): string[] {
  const [min, q1, q2, q3] = breaks
  return [
    `${min.toLocaleString()} – ${q1.toLocaleString()}`,
    `${(q1 + 1).toLocaleString()} – ${q2.toLocaleString()}`,
    `${(q2 + 1).toLocaleString()} – ${q3.toLocaleString()}`,
    `${(q3 + 1).toLocaleString()} 이상`,
  ]
}
