// Self-check for the spin draw: node scripts/draw-check.mjs
import assert from 'node:assert'
import { draw } from '../src/draw.js'

const pool = Array.from({ length: 11 }, (_, i) => 'g' + i)
assert.equal(draw(pool, 7).length, 7)

// first spin is a plain equal-odds pick
const first = {}
for (let i = 0; i < 55000; i++) { const g = draw(pool, 1)[0]; first[g] = (first[g] || 0) + 1 }
for (const g of pool) assert(Math.abs(first[g] - 5000) < 300, `first pick not uniform: ${g} ${first[g]}`)

// long-run share stays equal for every gun
const long = {}
for (const g of draw(pool, 220000)) long[g] = (long[g] || 0) + 1
for (const g of pool) assert(Math.abs(long[g] / 2200 - 9.09) < 0.4, `long-run share off: ${g}`)

// streaks: repeats are possible but 4+ of one gun in 10 spins is very rare
let repeats = 0, many = 0
const R = 20000
for (let t = 0; t < R; t++) {
  const r = draw(pool, 10)
  if (r.some((g, i) => g === r[i - 1])) repeats++
  const c = {}
  r.forEach((g) => (c[g] = (c[g] || 0) + 1))
  if (Math.max(...Object.values(c)) >= 4) many++
}
console.log(`batches with a back-to-back repeat: ${((100 * repeats) / R).toFixed(1)}%, with 4+ of one gun: ${((100 * many) / R).toFixed(2)}%`)
assert(repeats > 0, 'repeats should still be possible')
assert(many / R < 0.005, '4+ of one gun in 10 spins is too common')
console.log('ok')
