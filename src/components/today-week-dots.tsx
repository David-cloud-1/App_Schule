import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WeekDay } from '@/lib/home-today'

interface TodayWeekDotsProps {
  days: WeekDay[]
}

/** Wochenstreak Mo–So auf dem „Heute“-Screen (PROJ-42). */
export function TodayWeekDots({ days }: TodayWeekDotsProps) {
  return (
    <ol aria-label="Lerntage diese Woche" className="flex justify-between">
      {days.map((day) => (
        <li key={day.dateStr} className="flex flex-col items-center gap-1.5">
          <span
            aria-label={`${day.label}: ${day.learned ? 'gelernt' : day.isFuture ? 'noch offen' : 'nicht gelernt'}`}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200',
              day.learned && 'bg-[#FF9600] shadow-md shadow-orange-900/40',
              !day.learned && day.isToday && 'border-2 border-dashed border-[#FF9600]/70',
              !day.learned && !day.isToday && day.isFuture && 'border border-[#374151]',
              !day.learned && !day.isToday && !day.isFuture && 'bg-[#1F2937]',
            )}
          >
            {day.learned && <Flame className="size-4 text-white" />}
          </span>
          <span
            className={cn(
              'text-[11px] font-medium',
              day.isToday ? 'text-[#F9FAFB] font-bold' : 'text-[#6B7280]',
            )}
          >
            {day.label}
          </span>
        </li>
      ))}
    </ol>
  )
}
