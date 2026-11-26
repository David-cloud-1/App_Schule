// Nur für Tests: jsdom liefert keine eigenen Typen mit (PROJ-116)
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string, options?: { runScripts?: 'dangerously' | 'outside-only'; url?: string; pretendToBeVisual?: boolean })
    window: unknown
  }
}
