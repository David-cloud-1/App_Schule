'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type GradeBoundary = { grade: 1 | 2 | 3 | 4 | 5 | 6; minPercent: number }

export const IHK_DEFAULT_SCALE: GradeBoundary[] = [
  { grade: 1, minPercent: 92 },
  { grade: 2, minPercent: 81 },
  { grade: 3, minPercent: 67 },
  { grade: 4, minPercent: 50 },
  { grade: 5, minPercent: 30 },
  { grade: 6, minPercent: 0 },
]

interface Props {
  scale: GradeBoundary[]
  onChange: (scale: GradeBoundary[]) => void
  error?: string
}

/**
 * Editor for the six IHK-style grade boundaries (Note 1-6, minimum percent
 * to reach each). Grade 6 always starts at 0% and isn't editable — it's the
 * catch-all. Validation (descending, no gaps to 100) happens in the caller
 * so the same rule can run before submit.
 */
export function GradingScaleEditor({ scale, onChange, error }: Props) {
  function setBoundary(grade: number, value: string) {
    const num = Number(value)
    onChange(scale.map((b) => (b.grade === grade ? { ...b, minPercent: Number.isFinite(num) ? num : 0 } : b)))
  }

  return (
    <div className="space-y-2">
      <Label>Notenschlüssel (ab wie viel % gilt die Note)</Label>
      <div className="grid grid-cols-3 gap-2">
        {scale.map((b) => (
          <div key={b.grade} className="flex items-center gap-2 bg-[#111827] border border-[#4B5563] rounded-xl px-3 py-2">
            <span className="text-sm font-bold text-[#F9FAFB] w-4">{b.grade}</span>
            {b.grade === 6 ? (
              <span className="text-sm text-[#6B7280]">ab 0 %</span>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#6B7280]">ab</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={b.minPercent}
                  onChange={(e) => setBoundary(b.grade, e.target.value)}
                  className="h-7 w-14 bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] text-sm px-2"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-[#FF4B4B]">{error}</p>}
      <p className="text-xs text-[#6B7280]">Vorbelegt mit dem IHK-Schlüssel — bei Bedarf anpassbar.</p>
    </div>
  )
}

/** Grenzen müssen lückenlos absteigend sein (Note 1 > Note 2 > … > Note 6 = 0). */
export function validateGradingScale(scale: GradeBoundary[]): string | null {
  const sorted = [...scale].sort((a, b) => a.grade - b.grade)
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]
    if (b.minPercent < 0 || b.minPercent > 100) return 'Grenzen müssen zwischen 0 und 100 % liegen.'
    if (i > 0 && b.minPercent >= sorted[i - 1].minPercent) {
      return 'Grenzen müssen von Note 1 zu Note 6 absteigend sein.'
    }
  }
  if (sorted[sorted.length - 1]?.minPercent !== 0) return 'Note 6 muss bei 0 % beginnen.'
  return null
}
