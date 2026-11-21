import type { MetadataRoute } from 'next'
import { getCurrentDepartment } from '@/lib/departments-server'
import { NEUTRAL_BRANDING } from '@/lib/departments'
import { appIconPrefix } from '@/lib/push-client'

/**
 * Web-App-Manifest (PROJ-18): macht die App installierbar („Zum Home-Bildschirm“).
 * Name und Symbol folgen der aufgerufenen Adresse (SpediLern / TouristikLern),
 * denn Push-Erinnerungen gelten je Adresse. Kein Offline-Caching.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const department = await getCurrentDepartment()
  const name = department?.appName ?? NEUTRAL_BRANDING.appName
  const prefix = appIconPrefix(department?.code)
  return {
    name,
    short_name: name,
    description: department?.metaDescription || NEUTRAL_BRANDING.tagline,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#111827',
    theme_color: '#111827',
    lang: 'de',
    icons: [
      { src: `/icons/${prefix}-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/icons/${prefix}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `/icons/${prefix}-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
