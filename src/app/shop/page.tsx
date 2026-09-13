import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ShopClient } from './shop-client'

export default async function ShopPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <ShopClient />
}
