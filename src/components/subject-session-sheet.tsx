'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Topic {
  id: string
  name: string
}

interface SubjectInfo {
  id: string
  name: string
  code: string
  color: string
}

interface Props {
  subject: SubjectInfo | null
  initialClassLevel: string
  onClose: () => void
}

const CLASS_LEVELS = [
  { value: '', label: 'Alle Klassen' },
  { value: '10', label: 'Klasse 10' },
  { value: '11', label: 'Klasse 11' },
  { value: '12', label: 'Klasse 12' },
]

export function SubjectSessionSheet({ subject, initialClassLevel, onClose }: Props) {
  const router = useRouter()
  const [classLevel, setClassLevel] = useState(initialClassLevel)
  const [topicId, setTopicId] = useState<string>('')   // '' = Gemischt
  const [topics, setTopics] = useState<Topic[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  // Reset selections and fetch topics whenever the sheet opens for a new subject
  useEffect(() => {
    if (!subject) return
    setClassLevel(initialClassLevel)
    setTopicId('')
    setTopics([])
    setLoadingTopics(true)

    fetch(`/api/topics?subject_id=${subject.id}`)
      .then((r) => r.json())
      .then((data) => setTopics(data.topics ?? []))
      .catch(() => setTopics([]))
      .finally(() => setLoadingTopics(false))
  }, [subject?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    if (!subject) return
    const params = new URLSearchParams({ subject: subject.id })
    if (classLevel) params.set('class_level', classLevel)
    if (topicId) params.set('topic', topicId)
    router.push(`/quiz?${params.toString()}`)
    onClose()
  }

  const showTopics = !loadingTopics && topics.length > 0

  return (
    <Sheet open={!!subject} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="bottom"
        className="bg-[#1F2937] border-t border-[#4B5563] rounded-t-3xl px-5 pb-8 pt-6 max-w-md mx-auto"
      >
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="text-[#F9FAFB] text-lg font-bold">
            {subject?.code} – {subject?.name}
          </SheetTitle>
        </SheetHeader>

        {/* Klassenstufe */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
            Jahrgangsstufe
          </p>
          <div className="flex gap-2 flex-wrap">
            {CLASS_LEVELS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setClassLevel(value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  classLevel === value
                    ? 'bg-[#1CB0F6]/20 border-[#1CB0F6] text-[#F9FAFB]'
                    : 'border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#9CA3AF]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Thema — only shown if topics exist */}
        {(loadingTopics || showTopics) && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
              Thema <span className="normal-case font-normal text-[#6B7280]">(optional)</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {loadingTopics ? (
                <>
                  <Skeleton className="h-9 w-24 rounded-full bg-[#374151]" />
                  <Skeleton className="h-9 w-32 rounded-full bg-[#374151]" />
                  <Skeleton className="h-9 w-20 rounded-full bg-[#374151]" />
                </>
              ) : (
                <>
                  {/* Gemischt is always first and is the default */}
                  <button
                    onClick={() => setTopicId('')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                      topicId === ''
                        ? 'bg-[#58CC02]/20 border-[#58CC02] text-[#F9FAFB]'
                        : 'border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#9CA3AF]'
                    }`}
                  >
                    Gemischt
                  </button>
                  {topics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTopicId(t.id)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                        topicId === t.id
                          ? 'bg-[#58CC02]/20 border-[#58CC02] text-[#F9FAFB]'
                          : 'border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#9CA3AF]'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={handleStart}
          className="w-full rounded-2xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-bold py-6 text-base transition-all duration-200 active:scale-95"
        >
          Lernen starten
        </Button>
      </SheetContent>
    </Sheet>
  )
}
