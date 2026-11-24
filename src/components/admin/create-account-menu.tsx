'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, FileSpreadsheet, UserPlus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CreateAccountDialog } from '@/components/admin/create-account-dialog'

/** Seite „Konten aus Liste anlegen“ (PROJ-62) */
export const BULK_CREATE_PATH = '/admin/users/aus-liste'

/**
 * „Konto anlegen“ im Seitenkopf der Nutzerliste (PROJ-62, nur Super-Admin):
 * die grüne Hauptaktion mit Menü „Einzeln“ und „Aus CSV-Liste“.
 */
export function CreateAccountMenu({ onCreated }: { onCreated: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
            <UserPlus className="size-5" />
            Konto anlegen
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-ws-surface border-ws-line text-ws-text">
          <DropdownMenuItem
            onSelect={() => setDialogOpen(true)}
            className="min-h-11 focus:bg-ws-bg focus:text-ws-text"
          >
            <UserRound className="size-4" />
            Einzeln
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="min-h-11 focus:bg-ws-bg focus:text-ws-text">
            <Link href={BULK_CREATE_PATH}>
              <FileSpreadsheet className="size-4" />
              Aus CSV-Liste
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateAccountDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={onCreated} />
    </>
  )
}
