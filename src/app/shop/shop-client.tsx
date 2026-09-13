'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Coins, Loader2, CheckCircle2, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ShopItem {
  id: string
  name: string
  description: string
  icon: string
  price: number
  owned: boolean
}

interface ItemsResponse {
  items: ShopItem[]
  coin_balance: number
}

async function loadItems(): Promise<ItemsResponse | null> {
  try {
    const res = await fetch('/api/shop/items')
    if (!res.ok) return null
    return (await res.json()) as ItemsResponse
  } catch (err) {
    console.error('[ShopClient] load failed:', err)
    return null
  }
}

export function ShopClient() {
  const [items, setItems] = useState<ShopItem[] | null>(null)
  const [coinBalance, setCoinBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [justPurchased, setJustPurchased] = useState<ShopItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await loadItems()
    if (!data) {
      setFailed(true)
      setLoading(false)
      return
    }
    setItems(data.items)
    setCoinBalance(data.coin_balance)
    setFailed(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handlePurchase(item: ShopItem) {
    if (purchasingId) return
    setPurchasingId(item.id)
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Kauf fehlgeschlagen')
        // Item price/availability may have changed server-side — refresh.
        load()
        return
      }
      setCoinBalance(data.new_coin_balance ?? coinBalance - item.price)
      setItems((prev) => (prev ?? []).map((i) => (i.id === item.id ? { ...i, owned: true } : i)))
      setJustPurchased(item)
    } catch (err) {
      console.error('[ShopClient] purchase failed:', err)
      toast.error('Netzwerkfehler')
    } finally {
      setPurchasingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-semibold text-[#F9FAFB]">Speditionshof</span>
          </div>
          <div className="flex items-center gap-1 bg-[#111827] rounded-full px-3 py-1.5 border border-[#4B5563]">
            <Coins size={13} className="text-[#FFD700]" />
            <span className="text-xs font-bold text-[#F9FAFB]">
              {loading ? '···' : coinBalance.toLocaleString('de-DE')}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex-1 w-full">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl bg-[#1F2937]" />
            ))}
          </div>
        ) : failed ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <Store size={48} className="text-[#4B5563] mb-4" />
            <p className="text-[#9CA3AF] mb-4">Der Hof konnte nicht geladen werden.</p>
            <Button onClick={load} variant="outline" className="rounded-2xl border-[#4B5563] text-[#9CA3AF]">
              Erneut versuchen
            </Button>
          </div>
        ) : !items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <Store size={48} className="text-[#4B5563] mb-4" />
            <p className="text-[#9CA3AF]">Der Hof ist noch leer — schau bald wieder vorbei.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => {
              const canAfford = coinBalance >= item.price
              const isPurchasing = purchasingId === item.id

              return (
                <div
                  key={item.id}
                  className={cn(
                    'bg-[#1F2937] border rounded-2xl p-4 flex flex-col items-center text-center gap-2',
                    item.owned ? 'border-[#FFD700]/40' : 'border-[#4B5563]',
                  )}
                >
                  <span className="text-4xl" role="img" aria-label={item.name}>
                    {item.icon}
                  </span>
                  <p className="text-sm font-bold text-[#F9FAFB] leading-tight">{item.name}</p>
                  <p className="text-xs text-[#9CA3AF] leading-snug line-clamp-2">{item.description}</p>

                  {item.owned ? (
                    <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#FFD700]">
                      <CheckCircle2 size={14} />
                      Im Besitz
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford || isPurchasing}
                        className={cn(
                          'w-full mt-1 rounded-xl font-bold text-xs py-4 transition-all duration-200 active:scale-95',
                          canAfford
                            ? 'bg-[#FFD700] hover:bg-[#e6c200] text-[#111827]'
                            : 'bg-[#374151] text-[#6B7280]',
                        )}
                      >
                        {isPurchasing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-1">
                            <Coins size={13} />
                            {item.price}
                          </span>
                        )}
                      </Button>
                      {!canAfford && (
                        <p className="text-[10px] text-[#6B7280]">
                          Dir fehlen {item.price - coinBalance} Münzen
                        </p>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Purchase confirmation */}
      <Dialog open={!!justPurchased} onOpenChange={(v) => !v && setJustPurchased(null)}>
        <DialogContent className="bg-[#1F2937] border-[#4B5563] rounded-2xl max-w-xs mx-auto text-center px-6 py-8 [&>button]:text-[#9CA3AF]">
          {justPurchased && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-[#FFD700]/15 border-4 border-[#FFD700]/40">
                  <span className="text-4xl" role="img" aria-label={justPurchased.name}>
                    {justPurchased.icon}
                  </span>
                </div>
              </div>
              <div className="mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#FFD700]">
                  Neu für deinen Hof!
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#F9FAFB] mb-2">{justPurchased.name}</h2>
              <p className="text-[#9CA3AF] text-sm leading-relaxed mb-6">{justPurchased.description}</p>
              <Button
                onClick={() => setJustPurchased(null)}
                className="w-full rounded-2xl bg-[#FFD700] hover:bg-[#e6c200] text-[#111827] font-bold py-5 transition-all duration-200 active:scale-95"
              >
                Weiter 🎉
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
