'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Edit, Plus, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ShopItemFormModal,
  type AdminShopItemRow,
} from '@/components/admin/shop-item-form-modal'
import { useDepartment } from '@/components/department-provider'
import { HofItemIcon } from '@/components/hof-item-icon'
import { HofRarityLabel } from '@/components/hof-rarity-frame'
import { hofCategoryLabel, type HofCategory } from '@/lib/hof-icons'
import type { HofRarity } from '@/lib/hof-rarity'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminErrorState, AdminEmptyState } from '@/components/admin/admin-states'

type ShopItemListItem = {
  id: string
  name: string
  description: string
  category: HofCategory | ''
  icon_key: string
  icon?: string | null
  price: number
  rarity?: HofRarity
  rarity_override?: HofRarity | null
  is_active: boolean
  purchase_count: number
}

export default function AdminShopItemsPage() {
  const { hofName, hofShortName, code: departmentCode } = useDepartment()
  const [items, setItems] = useState<ShopItemListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminShopItemRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const res = await fetch('/api/admin/shop-items')
      if (!res.ok) {
        setLoadFailed(true)
        return
      }
      const json = await res.json()
      setItems(json.items ?? [])
    } catch (err) {
      console.error(err)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [hofShortName])

  useEffect(() => {
    load()
  }, [load])

  async function toggleActive(item: ShopItemListItem, next: boolean) {
    try {
      const res = await fetch(`/api/admin/shop-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Status konnte nicht geändert werden.')
        return
      }
      toast.success(next ? 'Item aktiviert' : 'Item deaktiviert')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    }
  }

  // Leere Liste: die Hauptaktion steht dann im Leerzustand, nicht doppelt im Seitenkopf
  const showEmpty = !loadFailed && !loading && items.length === 0

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={<>{hofShortName}-Items</>}
        description={<>{items.length} {items.length === 1 ? 'Item' : 'Items'} im {hofName}-Katalog</>}
        actions={
          showEmpty ? undefined : (
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neues Item
            </Button>
          )
        }
      />

      {loadFailed ? (
        <AdminErrorState message="Die Items konnten gerade nicht geladen werden." onRetry={load} />
      ) : showEmpty ? (
        <AdminEmptyState
          icon={Store}
          title={`Noch keine ${hofShortName}-Items`}
          description="Lege das erste Item für den Katalog an."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl min-h-11"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neues Item
            </Button>
          }
        />
      ) : (
        <div className="ws-table-scroll ws-table-sticky border border-ws-line rounded-2xl overflow-hidden bg-ws-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-ws-bg hover:bg-ws-bg border-ws-line">
                <TableHead className="text-ws-muted">Item</TableHead>
                <TableHead className="text-ws-muted">Kategorie</TableHead>
                <TableHead className="text-ws-muted">Seltenheit</TableHead>
                <TableHead className="text-ws-muted">Preis</TableHead>
                <TableHead className="text-ws-muted">Käufe</TableHead>
                <TableHead className="text-ws-muted">Status</TableHead>
                <TableHead className="text-right text-ws-muted">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-ws-line">
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-10 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow className="border-ws-line">
                  <TableCell colSpan={7} className="text-center text-ws-muted py-10">
                    Noch keine {hofShortName}-Items angelegt.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  return (
                    <TableRow key={item.id} className="border-ws-line hover:bg-ws-bg/40">
                      <TableCell className="text-ws-text font-medium">
                        <div className="flex items-center gap-2">
                          <HofItemIcon
                            departmentCode={departmentCode}
                            iconKey={item.icon_key}
                            legacyIcon={item.icon}
                            name={item.name}
                            svgClassName="w-6 h-6"
                            isoClassName="w-12 h-10"
                            emojiClassName="text-xl"
                          />
                          <div>
                            <p>{item.name}</p>
                            <p className="text-xs text-ws-muted font-normal">{item.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-ws-muted text-sm">
                        {item.category ? hofCategoryLabel(item.category, departmentCode) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.rarity && item.rarity !== 'standard' ? (
                          <HofRarityLabel
                            rarity={item.rarity}
                            className={item.rarity === 'episch' ? 'text-ws-gold bg-ws-gold/10' : 'text-ws-blue bg-ws-blue/10'}
                          />
                        ) : (
                          <span className="text-ws-faint">Standard</span>
                        )}
                        {item.rarity_override && (
                          <span className="ml-1 text-[10px] text-ws-faint" title="Manuell gesetzt">
                            (manuell)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-ws-text">{item.price}</TableCell>
                      <TableCell className="text-ws-text">{item.purchase_count}</TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(v) => toggleActive(item, v)}
                          aria-label="Aktiv/Inaktiv"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditing({
                                      id: item.id,
                                      name: item.name,
                                      description: item.description,
                                      category: item.category,
                                      icon_key: item.icon_key,
                                      price: item.price,
                                      rarity_override: item.rarity_override ?? null,
                                    })
                                    setFormOpen(true)
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {item.purchase_count > 0 && (
                              <TooltipContent className="bg-ws-bg text-ws-text border-ws-line">
                                Bereits {item.purchase_count}× gekauft — Preisänderung wirkt nur auf
                                künftige Käufe.
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ShopItemFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        onSuccess={load}
      />
    </div>
  )
}
