'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Edit, Plus } from 'lucide-react'
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

type ShopItemListItem = {
  id: string
  name: string
  description: string
  icon: string
  price: number
  is_active: boolean
  purchase_count: number
}

export default function AdminShopItemsPage() {
  const [items, setItems] = useState<ShopItemListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminShopItemRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/shop-items')
      if (!res.ok) {
        toast.error('Hof-Items konnten nicht geladen werden.')
        return
      }
      const json = await res.json()
      setItems(json.items ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }, [])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">Hof-Items</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {items.length} {items.length === 1 ? 'Item' : 'Items'} im Speditionshof-Katalog
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neues Item
        </Button>
      </div>

      <div className="border border-[#4B5563] rounded-2xl overflow-hidden bg-[#1F2937]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#111827] hover:bg-[#111827] border-[#4B5563]">
              <TableHead className="text-[#9CA3AF]">Item</TableHead>
              <TableHead className="text-[#9CA3AF]">Preis</TableHead>
              <TableHead className="text-[#9CA3AF]">Käufe</TableHead>
              <TableHead className="text-[#9CA3AF]">Status</TableHead>
              <TableHead className="text-right text-[#9CA3AF]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-[#4B5563]">
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
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
              <TableRow className="border-[#4B5563]">
                <TableCell colSpan={5} className="text-center text-[#9CA3AF] py-10">
                  Noch keine Hof-Items angelegt.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                return (
                  <TableRow key={item.id} className="border-[#4B5563] hover:bg-[#111827]/40">
                    <TableCell className="text-[#F9FAFB] font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" role="img" aria-label={item.name}>
                          {item.icon}
                        </span>
                        <div>
                          <p>{item.name}</p>
                          <p className="text-xs text-[#9CA3AF] font-normal">{item.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#F9FAFB]">{item.price}</TableCell>
                    <TableCell className="text-[#F9FAFB]">{item.purchase_count}</TableCell>
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
                                    icon: item.icon,
                                    price: item.price,
                                  })
                                  setFormOpen(true)
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {item.purchase_count > 0 && (
                            <TooltipContent className="bg-[#111827] text-[#F9FAFB] border-[#4B5563]">
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

      <ShopItemFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        onSuccess={load}
      />
    </div>
  )
}
