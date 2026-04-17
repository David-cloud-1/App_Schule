import { Skeleton } from '@/components/ui/skeleton'
import { Truck } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#111827]">
      {/* Header skeleton */}
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#58CC02]" />
            <span className="font-bold text-[#F9FAFB]">SpediLern</span>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-20 rounded-full bg-[#374151]" />
            <Skeleton className="h-7 w-16 rounded-full bg-[#374151]" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Gamification header skeleton */}
        <Skeleton className="h-28 w-full rounded-2xl bg-[#1F2937]" />

        {/* Subject progress section label */}
        <Skeleton className="h-4 w-32 rounded bg-[#374151]" />

        {/* Subject progress cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl bg-[#1F2937]" />
          ))}
        </div>

        {/* Week activity */}
        <Skeleton className="h-24 w-full rounded-2xl bg-[#1F2937]" />

        {/* Stats row label */}
        <Skeleton className="h-4 w-28 rounded bg-[#374151]" />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl bg-[#1F2937]" />
          ))}
        </div>

        {/* CTA button */}
        <Skeleton className="h-14 w-full rounded-2xl bg-[#1F2937]" />
      </main>
    </div>
  )
}
