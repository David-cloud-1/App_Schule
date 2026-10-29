import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

/**
 * Zeigt Beiträge und Antworten des Lehrerzimmers (PROJ-63, E6). Erlaubt sind
 * nur Absätze, fett, kursiv, Listen, Zeilenumbrüche und Links. Rohes HTML,
 * Bilder, Überschriften, Tabellen usw. werden nicht dargestellt (der Text
 * bleibt, die Auszeichnung entfällt). Links nur mit http(s) und mailto,
 * immer in neuem Tab und mit `nofollow`.
 */
const ALLOWED_ELEMENTS = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br']

export function safeForumUrl(url: string): string {
  return /^(https?:|mailto:)/i.test(url.trim()) ? url : ''
}

export function ForumMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('break-words text-base leading-relaxed text-ws-text [overflow-wrap:anywhere]', className)}>
      <ReactMarkdown
        skipHtml
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        urlTransform={safeForumUrl}
        components={{
          // Einfache Zeilenumbrüche aus dem Eingabefeld bleiben sichtbar
          p: ({ children }) => <p className="mb-3 whitespace-pre-line last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6 last:mb-0">{children}</ol>,
          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-ws-blue underline underline-offset-2 hover:text-ws-blue-hover"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
