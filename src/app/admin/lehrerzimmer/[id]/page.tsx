import { ForumThreadView } from '@/components/admin/forum-thread-view'

export const metadata = { title: 'Beitrag – Lehrerzimmer' }

export default async function BeitragPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ForumThreadView id={id} />
}
