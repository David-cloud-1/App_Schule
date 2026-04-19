'use client'

import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { GenerationJob } from './ai-generator-upload-zone'

interface Props {
  job: GenerationJob
  onRetry: (jobId: string) => Promise<void>
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AiGeneratorJobCard({ job, onRetry }: Props) {
  const config = {
    uploading: {
      label: 'Wird hochgeladen',
      badgeLabel: 'Hochladen',
      color: 'text-[#1CB0F6]',
      icon: <Loader2 className="w-5 h-5 animate-spin text-[#1CB0F6] flex-shrink-0" />,
    },
    processing: {
      label: 'KI verarbeitet Dokument…',
      badgeLabel: 'Verarbeitung',
      color: 'text-[#FF9600]',
      icon: <Loader2 className="w-5 h-5 animate-spin text-[#FF9600] flex-shrink-0" />,
    },
    completed: {
      label: `${job.questions_generated ?? 0} Fragen generiert`,
      badgeLabel: 'Abgeschlossen',
      color: 'text-[#58CC02]',
      icon: <CheckCircle2 className="w-5 h-5 text-[#58CC02] flex-shrink-0" />,
    },
    error: {
      label: job.error_message ?? 'Verarbeitung fehlgeschlagen',
      badgeLabel: 'Fehler',
      color: 'text-[#FF4B4B]',
      icon: <AlertCircle className="w-5 h-5 text-[#FF4B4B] flex-shrink-0" />,
    },
  }[job.status]

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl border bg-[#1F2937] ${
        job.status === 'error' ? 'border-[#FF4B4B]/40' : 'border-[#4B5563]'
      }`}
    >
      {config.icon}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#F9FAFB] truncate">{job.filename}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs ${config.color}`}>{config.label}</span>
          <span className="text-xs text-[#4B5563]">·</span>
          <span className="text-xs text-[#9CA3AF]">{formatSize(job.file_size)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {job.status === 'error' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRetry(job.id)}
            className="rounded-xl border-[#4B5563] text-[#9CA3AF] hover:text-[#F9FAFB]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Wiederholen
          </Button>
        )}
        <Badge
          variant="outline"
          className={`text-xs border-current whitespace-nowrap ${config.color}`}
        >
          {config.badgeLabel}
        </Badge>
      </div>
    </div>
  )
}
