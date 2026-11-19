# Rate Limiting – Stand dieses Projekts

> Die Anleitung weiter unten (Upstash) ist nur eine Vorlage und **nicht eingebaut**.

## Was gilt
- **Schreibende API-Aufrufe** (POST, PUT, PATCH, DELETE unter `/api/`): 120 pro Minute und Person. Umgesetzt im Proxy ([src/proxy.ts](../../src/proxy.ts)), Regeln in [src/lib/rate-limit.ts](../../src/lib/rate-limit.ts).
- **Teure Wege** (KI-Upload, Prüfungs-Extraktion, Werkzeugkiste einlesen/direkt/weiterschreiben/fortsetzen): 20 pro 10 Minuten und Person.
- Lesezugriffe, `/api/cron/` und `/api/intern/` werden nicht gezählt.
- Der Zähler liegt in der Datenbank (`rate_limits`, Funktion `rate_limit_hit`), gilt also über alle Server-Instanzen und kostet nichts extra. Migration: `supabase/migrations/20261124_rate_limit.sql`, Rückweg `..._down.sql`.
- **Fällt der Zähler aus** (Funktion fehlt, Datenbank nicht erreichbar), gilt „erlaubt“. Das Limit legt die App nie lahm.
- Weitere, ältere Sperren: Prüfungscode-Eingabe (10 Fehlversuche / 10 Min.), öffentliche Links `/s/<Code>`, Passwortprüfung im Profil.

## Was nicht in der App liegt: Login & Registrierung
Anmelden, Registrieren und „Passwort vergessen“ gehen direkt vom Browser zu Supabase Auth. Die App sieht diese Aufrufe nicht. Die Grenzen stellst du im Supabase-Dashboard ein:

**Authentication → Rate Limits** (je nach Plan sind nicht alle Werte änderbar)
- Anmeldungen und Registrierungen je IP und 5 Minuten: eher niedrig lassen (Richtwert 30 oder weniger). Hinweis: In einer Schule teilen sich viele Geräte eine IP-Adresse, deshalb nicht zu knapp einstellen.
- E-Mails (Passwort zurücksetzen, Bestätigung): je Stunde begrenzt lassen; bei der eingebauten E-Mail-Funktion von Supabase ist das Limit sehr klein, für den Schulbetrieb besser einen eigenen SMTP-Zugang eintragen.
- **Authentication → Attack Protection**: Captcha (Cloudflare Turnstile oder hCaptcha) für Registrierung und „Passwort vergessen“ einschalten. Das ist die wirksamste Maßnahme gegen automatisch angelegte Konten.
- **Authentication → Sign In / Providers → E-Mail**: Mindestlänge des Passworts (Richtwert 10) und „Leaked Password Protection“ prüfen.

---

# Rate Limiting

Prevent abuse, DDoS attacks, and excessive API usage.

## When to Add Rate Limiting
- **MVP:** Optional (focus on features first)
- **Production with users:** Recommended on auth endpoints and public APIs
- **Public-facing APIs:** Required

## Setup with Upstash Redis

### 1. Install Dependencies
```bash
npm install @upstash/ratelimit @upstash/redis
```

### 2. Create Upstash Account
- Go to [upstash.com](https://upstash.com) (free tier: 10k requests/day)
- Create a Redis database
- Copy REST URL and token

### 3. Add Environment Variables
```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

### 4. Create Rate Limiter
```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
})
```

### 5. Use in API Routes
```typescript
// src/app/api/example/route.ts
import { ratelimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success, limit, remaining } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    )
  }

  // Process request normally...
}
```

### 6. Use in Middleware (Global)
```typescript
// middleware.ts
import { ratelimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(ip)

    if (!success) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }
  }
}

export const config = {
  matcher: '/api/:path*',
}
```

## Recommended Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Login/Register | 5 requests | 1 minute |
| Password Reset | 3 requests | 5 minutes |
| General API | 30 requests | 10 seconds |
| File Upload | 5 requests | 1 minute |

## Alternative
**Vercel Edge Config** - Simpler but less flexible. Built into Vercel, no external service needed.
