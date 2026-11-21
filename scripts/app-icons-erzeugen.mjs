// Erzeugt die App-Symbole für den Home-Bildschirm (PROJ-18): je Fachbereich
// 192 px, 512 px, eine „maskable“-Variante (Android schneidet rund zu) und das
// Apple-Touch-Icon (180 px). Aufruf: node scripts/app-icons-erzeugen.mjs
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Truck, Plane, GraduationCap } from 'lucide-react'
import sharp from 'sharp'

const BEREICHE = { sped: Truck, tour: Plane, neutral: GraduationCap }
const GRUEN = '#58CC02'

function svgFuer(Icon, groesse, maskable) {
  // Randlos grün: iOS und Android runden die Ecken selbst ab. Bei „maskable“
  // bleibt das Symbol in der sicheren Mitte, weil Android rund zuschneiden darf.
  const iconSize = groesse * (maskable ? 0.46 : 0.58)
  const off = (groesse - iconSize) / 2
  const inner = renderToStaticMarkup(
    createElement(Icon, { size: iconSize, color: '#FFFFFF', strokeWidth: 2.25, x: off, y: off }),
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${groesse}" height="${groesse}">
  <rect width="${groesse}" height="${groesse}" fill="${GRUEN}"/>
  ${inner}
</svg>`
}

for (const [name, Icon] of Object.entries(BEREICHE)) {
  for (const [datei, groesse, maskable] of [
    [`${name}-192.png`, 192, false],
    [`${name}-512.png`, 512, false],
    [`${name}-maskable-512.png`, 512, true],
    [`${name}-apple-180.png`, 180, false],
  ]) {
    await sharp(Buffer.from(svgFuer(Icon, groesse, maskable))).png().toFile(`public/icons/${datei}`)
    console.log('geschrieben', `public/icons/${datei}`)
  }
}
