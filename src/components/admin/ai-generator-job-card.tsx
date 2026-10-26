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
      color: 'text-ws-blue',
      icon: <Loader2 className="w-5 h-5 animate-spin text-ws-blue flex-shrink-0" />,
    },
    processing: {
      label: 'KI verarbeitet Dokument…',
      badgeLabel: 'Verarbeitung',
      color: 'text-ws-orange',
      icon: <Loader2 className="w-5 h-5 animate-spin text-ws-orange flex-shrink-0" />,
    },
    completed: {
      label: `${job.questions_generated ?? 0} Fragen generiert`,
      badgeLabel: 'Abgeschlossen',
      color: 'text-ws-green',
      icon: <CheckCircle2 className="w-5 h-5 text-ws-green flex-shrink-0" />,
    },
    error: {
      label: job.error_message ?? 'Verarbeitung fehlgeschlagen',
      badgeLabel: 'Fehler',
      color: 'text-ws-red',
      icon: <AlertCircle className="w-5 h-5 text-ws-red flex-shrink-0" />,
    },
  }[job.status]

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl border bg-ws-surface ${
        job.status === 'error' ? 'border-ws-red/40' : 'border-ws-line'
      }`}
    >
      {config.icon}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ws-text truncate">{job.filename}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs ${config.color}`}>{config.label}</span>
          <span className="text-xs text-ws-line">·</span>
          <span className="text-xs text-ws-muted">{formatSize(job.file_size)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {job.status === 'error' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRetry(job.id)}
            className="rounded-xl border-ws-line text-ws-muted hover:text-ws-text"
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
