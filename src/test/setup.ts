import '@testing-library/jest-dom'
import { vi } from 'vitest'

// next/cache außerhalb von Next.js: Zwischenspeicher durchreichen, Invalidierung
// als Spion (PROJ-22/23 — Bereichsdaten werden per unstable_cache gespeichert).
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))
