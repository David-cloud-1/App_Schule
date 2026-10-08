import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Strengere React-Regeln aus eslint-config-next 16: der Bestand nutzt diese
    // Muster an vielen Stellen (setState im Effekt usw.) – als Warnung sichtbar,
    // aber ohne `npm run lint` zu blockieren. Bei Gelegenheit aufräumen.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'scripts/scratch/**', 'playwright-report/**', 'test-results/**']),
])
