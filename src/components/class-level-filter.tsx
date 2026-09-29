'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useClassLevelOptions } from '@/components/department-provider'

interface Props {
  current: string
}

export function ClassLevelFilter({ current }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const LEVELS = [{ value: '', label: 'Alle Klassen' }, ...useClassLevelOptions()]

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('class_level', value)
    } else {
      params.delete('class_level')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {LEVELS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => select(value)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            current === value
              ? 'bg-[#1CB0F6]/20 border-[#1CB0F6] text-[#F9FAFB]'
              : 'border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#9CA3AF]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
