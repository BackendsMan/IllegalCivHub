// Self-check for the spin draw: node scripts/draw-check.mjs
import assert from 'node:assert'
import { draw } from '../src/draw.js'

const pool = ['a', 'b', 'c', 'd', 'e']
for (const n of [1, 5, 7, 23, 100]) {
  const r = draw(pool, n)
  const v = pool.map((g) => r.filter((x) => x === g).length)
  assert(Math.max(...v) - Math.min(...v) <= 1, `unbalanced n=${n} ${v}`)
  assert(r.every((g, i) => g !== r[i - 1]), `back-to-back repeat n=${n}`)
}
const first = {}
for (let i = 0; i < 50000; i++) { const g = draw(pool, 1)[0]; first[g] = (first[g] || 0) + 1 }
console.log('first-pick counts (expect ~10000 each):', first)
for (const c of Object.values(first)) assert(Math.abs(c - 10000) < 500, 'first pick not uniform')
console.log('ok')
