'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TrashList, type TrashType } from '@/components/admin/trash-list'

/** Papierkorb als Fenster an der Seite, zu der die gelöschten Inhalte gehören (PROJ-131). */
export function TrashDialog({
  open,
  onOpenChange,
  type,
  title,
  description,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: TrashType
  title: string
  description: string
  onChanged?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-ws-line bg-ws-surface text-ws-text">
        <DialogHeader>
          <DialogTitle className="text-ws-text">{title}</DialogTitle>
          <DialogDescription className="text-ws-muted">{description}</DialogDescription>
        </DialogHeader>
        {open && <TrashList type={type} onChanged={onChanged} />}
      </DialogContent>
    </Dialog>
  )
}
