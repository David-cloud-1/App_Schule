'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Search, Tag, Trash2, X, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Subject = { id: string; code: string; name: string }
type Topic = { id: string; name: string; subject_id: string }

export default function TopicsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [newSubjectId, setNewSubjectId] = useState<string>('')
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadSubjects()
  }, [])

  useEffect(() => {
    loadTopics()
  }, [selectedSubjectId])

  async function loadSubjects() {
    const res = await fetch('/api/admin/subjects')
    if (!res.ok) return
    const data = await res.json()
    const subs: Subject[] = data.subjects ?? []
    setSubjects(subs)
    if (subs.length > 0 && !newSubjectId) {
      setNewSubjectId(subs[0].id)
    }
  }

  async function loadTopics() {
    setLoading(true)
    const url =
      selectedSubjectId === 'all'
        ? '/api/admin/topics'
        : `/api/admin/topics?subject_id=${selectedSubjectId}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setTopics(data.topics ?? [])
    }
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newSubjectId) return
    setCreating(true)
    const res = await fetch('/api/admin/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), subject_id: newSubjectId }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Fehler beim Erstellen')
    } else {
      toast.success('Thema erstellt')
      setNewName('')
      loadTopics()
    }
    setCreating(false)
  }

  function startEdit(topic: Topic) {
    setEditingId(topic.id)
    setEditName(topic.name)
  }

  async function handleSave(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    const res = await fetch(`/api/admin/topics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Fehler beim Speichern')
    } else {
      toast.success('Thema gespeichert')
      setEditingId(null)
      loadTopics()
    }
    setSaving(false)
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setDeleteTarget(null)
    const res = await fetch(`/api/admin/topics/${deleteTarget.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Fehler beim Löschen')
    } else {
      toast.success('Thema gelöscht')
      loadTopics()
    }
    setDeletingId(null)
  }

  const subjectCode = (id: string) =>
    subjects.find((s) => s.id === id)?.code ?? '—'

  const filteredTopics = topics
    .filter((t) => selectedSubjectId === 'all' || t.subject_id === selectedSubjectId)
    .filter((t) => !searchQuery.trim() || t.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  const groupedTopics: Record<string, Topic[]> = {}
  for (const t of filteredTopics) {
    if (!groupedTopics[t.subject_id]) groupedTopics[t.subject_id] = []
    groupedTopics[t.subject_id].push(t)
  }

  return (
    <div className="space-y-6">
      {/* Create new topic */}
      <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-5">
        <h2 className="text-base font-semibold text-[#F9FAFB] mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#58CC02]" />
          Neues Thema anlegen
        </h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <Select value={newSubjectId} onValueChange={setNewSubjectId}>
            <SelectTrigger className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] w-36">
              <SelectValue placeholder="Fach" />
            </SelectTrigger>
            <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Thema-Name (z.B. Volkswirtschaft)"
            maxLength={100}
            className="flex-1 min-w-48 bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
          />
          <Button
            type="submit"
            disabled={creating || !newName.trim() || !newSubjectId}
            className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Erstellen
          </Button>
        </form>
      </div>

      {/* Filter + list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold text-[#F9FAFB] flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#1CB0F6]" />
            Alle Themen
            {!loading && (
              <span className="text-xs text-[#9CA3AF] font-normal">
                ({filteredTopics.length})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Thema suchen…"
                className="pl-8 h-9 w-48 bg-[#111827] border-[#4B5563] text-[#F9FAFB] text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#F9FAFB]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                <SelectItem value="all">Alle Fächer</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#9CA3AF]" />
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF] text-sm">
            {searchQuery
              ? `Kein Thema gefunden für „${searchQuery}".`
              : 'Noch keine Themen vorhanden. Lege ein neues Thema an.'}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedTopics).map(([subjectId, subTopics]) => (
              <div key={subjectId} className="bg-[#1F2937] border border-[#4B5563] rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#374151] border-b border-[#4B5563]">
                  <span className="text-sm font-semibold text-[#F9FAFB]">
                    {subjectCode(subjectId)}
                  </span>
                  <span className="text-xs text-[#9CA3AF] ml-1.5">
                    — {subjects.find((s) => s.id === subjectId)?.name}
                  </span>
                  <span className="text-xs text-[#9CA3AF] ml-2">
                    · {subTopics.length} {subTopics.length === 1 ? 'Thema' : 'Themen'}
                  </span>
                </div>
                <ul className="divide-y divide-[#374151]">
                  {subTopics.map((topic) => (
                    <li key={topic.id} className="flex items-center gap-3 px-4 py-3">
                      {editingId === topic.id ? (
                        <>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                            maxLength={100}
                            className="flex-1 bg-[#111827] border-[#4B5563] text-[#F9FAFB] h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave(topic.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSave(topic.id)}
                            disabled={saving}
                            className="bg-[#58CC02] hover:bg-[#4CAD02] text-white h-8 px-2"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="text-[#9CA3AF] hover:text-[#F9FAFB] h-8 px-2"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-[#F9FAFB]">{topic.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(topic)}
                            className="text-[#9CA3AF] hover:text-[#F9FAFB] h-7 w-7 p-0"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(topic)}
                            disabled={deletingId === topic.id}
                            className="text-[#9CA3AF] hover:text-[#FF4B4B] h-7 w-7 p-0"
                          >
                            {deletingId === topic.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FF4B4B]" />
              Thema löschen?
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Das Thema <span className="font-semibold text-[#F9FAFB]">„{deleteTarget?.name}"</span> wird
              unwiderruflich gelöscht. Fragen, die diesem Thema zugewiesen sind, verlieren ihre Zuordnung.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="text-[#9CA3AF] hover:text-[#F9FAFB]"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleDeleteConfirmed}
              className="bg-[#FF4B4B] hover:bg-[#e04444] text-white"
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
