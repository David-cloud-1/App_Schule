import { ForumPostForm } from '@/components/admin/forum-post-form'

export const metadata = { title: 'Beitrag bearbeiten – Lehrerzimmer' }

export default async function BeitragBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ForumPostForm postId={id} />
}
