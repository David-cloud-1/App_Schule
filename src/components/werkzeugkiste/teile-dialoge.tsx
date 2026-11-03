'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * Rückfragen beim Weg in Teilen (PROJ-69). Beide Dialoge öffnen sich mit einem Satz vom Server
 * (`satz`); ohne Satz sind sie zu.
 */

/** Auswahl oder Einstellung ändern, obwohl schon Teil-Antworten eingefügt sind: Die Teile entstehen dann neu */
export function TeileVerwerfenDialog({
  satz,
  beiAuswahl,
}: {
  satz: string | null
  /** true = Teile verwerfen und die Änderung speichern */
  beiAuswahl: (verwerfen: boolean) => void
}) {
  return (
    <AlertDialog open={satz !== null} onOpenChange={(offen) => !offen && beiAuswahl(false)}>
      <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
        <AlertDialogHeader>
          <AlertDialogTitle>Die Teile entstehen neu</AlertDialogTitle>
          <AlertDialogDescription className="text-ws-muted">
            {satz} Wenn du die Auswahl oder die Einstellungen änderst, wird das Skript neu in Teile geteilt, und die Antworten
            müssen neu eingefügt werden. Trotzdem ändern?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 rounded-xl">Nein, behalten</AlertDialogCancel>
          <AlertDialogAction
            className="min-h-11 rounded-xl bg-ws-red font-semibold text-ws-on-accent hover:bg-ws-red-hover"
            onClick={() => beiAuswahl(true)}
          >
            Ja, Teile verwerfen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** „Weiter zur Datei“, obwohl ein Teil abgeschnitten ist: Der Rest davon fehlt in der Datei */
export function UnvollstaendigDialog({
  satz,
  beiAuswahl,
}: {
  satz: string | null
  /** true = trotzdem zusammenfügen */
  beiAuswahl: (weiter: boolean) => void
}) {
  return (
    <AlertDialog open={satz !== null} onOpenChange={(offen) => !offen && beiAuswahl(false)}>
      <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
        <AlertDialogHeader>
          <AlertDialogTitle>Ein Teil ist unvollständig</AlertDialogTitle>
          <AlertDialogDescription className="text-ws-muted">
            {satz} Du kannst den Rest noch nachholen oder die Datei ohne ihn bauen. Ohne den Rest fehlen diese Inhalte im Material.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 rounded-xl">Rest nachholen</AlertDialogCancel>
          <AlertDialogAction
            className="min-h-11 rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover"
            onClick={() => beiAuswahl(true)}
          >
            Ohne den Rest weiter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
