import Link from 'next/link'
import { CheckCircle2, Circle, CircleDot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/progress-ring'
import { quizHref, type TopicGroup, type TopicRow } from '@/lib/learn-library'
import { cn } from '@/lib/utils'

const PRIMARY = '#58CC02'

interface TopicPathProps {
  groups: TopicGroup[]
  subjectId: string
  color: string
  /** Gruppenüberschriften nur bei „Alle“ Klassenstufen */
  showGroupTitles: boolean
}

/** Themen eines Fachs als Lernpfad (PROJ-43). Ein Tap startet die Runde. */
export function TopicPath({ groups, subjectId, color, showGroupTitles }: TopicPathProps) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.classLevel ?? 'ohne'} aria-label={groupTitle(group.classLevel)}>
          {showGroupTitles && (
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              {groupTitle(group.classLevel)}
            </h2>
          )}
          <ul className="space-y-2">
            {group.topics.map((topic) => (
              <li key={`${topic.id}-${topic.classLevel}`}>
                <TopicLink topic={topic} subjectId={subjectId} color={color} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function groupTitle(classLevel: number | null) {
  return classLevel === null ? 'Weitere Themen' : `Klasse ${classLevel}`
}

const STATE_LABEL: Record<TopicRow['state'], string> = {
  neu: 'neu',
  angefangen: 'angefangen',
  gemeistert: 'gemeistert',
}

function TopicLink({ topic, subjectId, color }: { topic: TopicRow; subjectId: string; color: string }) {
  const mastered = topic.state === 'gemeistert'
  const barColor = mastered ? PRIMARY : color

  return (
    <Link
      href={quizHref({ subjectId, classLevel: topic.classLevel, topicId: topic.id })}
      aria-label={`${topic.name}, ${STATE_LABEL[topic.state]}, ${topic.percent} %${topic.isNext ? ', weiter hier' : ''}`}
      className={cn(
        'flex min-h-[60px] items-center gap-3 rounded-2xl border bg-[#1F2937] px-3 py-2.5 transition-all duration-200 hover:bg-[#374151]/60 active:scale-[0.98]',
        topic.isNext ? 'border-2' : 'border-[#374151]',
      )}
      style={topic.isNext ? { borderColor: color } : undefined}
    >
      <StateIcon state={topic.state} color={color} />
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className={cn('truncate text-sm font-semibold', topic.state === 'neu' ? 'text-[#D1D5DB]' : 'text-[#F9FAFB]')}>
            {topic.name}
          </span>
          {topic.isNext && (
            <Badge
              className="shrink-0 rounded-full border-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ backgroundColor: color }}
            >
              Weiter hier
            </Badge>
          )}
        </span>
        <ProgressBar percent={topic.percent} color={barColor} className="mt-2" />
      </span>
      <span className={cn('w-10 shrink-0 text-right text-sm font-bold tabular-nums', mastered ? 'text-[#58CC02]' : 'text-[#9CA3AF]')}>
        {topic.percent} %
      </span>
    </Link>
  )
}

function StateIcon({ state, color }: { state: TopicRow['state']; color: string }) {
  if (state === 'gemeistert') return <CheckCircle2 className="size-6 shrink-0 text-[#58CC02]" aria-hidden />
  if (state === 'angefangen') return <CircleDot className="size-6 shrink-0" style={{ color }} aria-hidden />
  return <Circle className="size-6 shrink-0 text-[#4B5563]" aria-hidden />
}
