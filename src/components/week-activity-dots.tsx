import { cn } from '@/lib/utils'

interface DayActivity {
  date: Date
  dateStr: string
  learned: boolean
  isToday: boolean
}

interface WeekActivityDotsProps {
  weekActivity: DayActivity[]
}

/** Abbreviate a Date to 2-letter German weekday label */
function toDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'Europe/Berlin' })
    .format(date)
    .replace('.', '')
    .slice(0, 2)
}

export function WeekActivityDots({ weekActivity }: WeekActivityDotsProps) {
  return (
    <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4">
      <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
        Aktivität – letzte 7 Tage
      </h3>
      <div className="flex justify-between items-end">
        {weekActivity.map((day) => (
          <div key={day.dateStr} className="flex flex-col items-center gap-1.5">
            {/* Dot */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
                day.learned
                  ? 'bg-[#58CC02] shadow-sm shadow-green-900/40'
                  : 'bg-[#374151]',
                day.isToday && !day.learned && 'ring-2 ring-[#4B5563] ring-offset-1 ring-offset-[#1F2937]',
                day.isToday && day.learned && 'ring-2 ring-[#58CC02]/50 ring-offset-1 ring-offset-[#1F2937]',
              )}
            >
              {day.learned && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="text-white"
                >
                  <path
                    d="M2.5 7L5.5 10L11.5 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            {/* Day label derived from actual date */}
            <span
              className={cn(
                'text-[10px] font-medium',
                day.isToday ? 'text-[#F9FAFB]' : 'text-[#6B7280]',
              )}
            >
              {toDayLabel(day.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
