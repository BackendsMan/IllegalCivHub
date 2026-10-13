// Self-check for the spin draw: node scripts/draw-check.mjs
import assert from 'node:assert'
import { draw } from '../src/draw.js'

const pool = ['a', 'b', 'c', 'd', 'e']
assert.equal(draw(pool, 7).length, 7)
// every gun equally likely, on every spin position
const N = 100000
for (const pos of [0, 1, 9]) {
  const c = {}
  for (let i = 0; i < N / 5; i++) { const g = draw(pool, 10)[pos]; c[g] = (c[g] || 0) + 1 }
  console.log(`spin #${pos + 1} counts (expect ~${N / 25} each):`, c)
  for (const g of pool) assert(Math.abs(c[g] - N / 25) < 600, `spin #${pos + 1}: ${g} not uniform`)
}
// repeats must be possible (independent spins)
assert(Array.from({ length: 200 }, () => draw(pool, 10)).some((r) => r.some((g, i) => g === r[i - 1])), 'no repeats ever')
console.log('ok')
