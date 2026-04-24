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

function toDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'Europe/Berlin' })
    .format(date)
    .replace('.', '')
    .slice(0, 2)
}

export function WeekActivityDots({ weekActivity }: WeekActivityDotsProps) {
  const learnedCount = weekActivity.filter((d) => d.learned).length

  return (
    <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
          Aktivität diese Woche
        </h3>
        <span className="text-xs font-bold text-[#58CC02]">{learnedCount}/7 Tage</span>
      </div>
      <div className="flex justify-between items-end">
        {weekActivity.map((day) => (
          <div key={day.dateStr} className="flex flex-col items-center gap-2">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
                day.learned
                  ? 'bg-[#58CC02] shadow-md shadow-green-900/40'
                  : 'bg-[#374151]',
                day.isToday && !day.learned && 'ring-2 ring-[#FF9600]/60 ring-offset-2 ring-offset-[#1F2937]',
                day.isToday && day.learned && 'ring-2 ring-[#58CC02]/60 ring-offset-2 ring-offset-[#1F2937]',
              )}
            >
              {day.learned ? (
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="text-white">
                  <path
                    d="M2.5 7L5.5 10L11.5 4"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : day.isToday ? (
                <span className="text-[#FF9600] text-base">🔥</span>
              ) : null}
            </div>
            <span className={cn(
              'text-[11px] font-medium',
              day.isToday ? 'text-[#F9FAFB]' : 'text-[#6B7280]',
            )}>
              {toDayLabel(day.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
