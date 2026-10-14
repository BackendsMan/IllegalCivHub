const rand = (n) => {
  // unbiased: rejection-sample crypto randoms instead of Math.random() * n
  const lim = 2 ** 32 - (2 ** 32 % n)
  const b = new Uint32Array(1)
  do crypto.getRandomValues(b)
  while (b[0] >= lim)
  return b[0] % n
}

export const shuffle = (a) => {
  a = [...a]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Fair with natural repeats: every spin is a plain equal-odds pick, except that a gun already seen in the last WINDOW spins
// has its odds cut by how many times it showed up (0 or 1 time: normal, 2: 10%, 3: 0%). So pairs happen at normal random
// rates, but the same gun can never appear more than 3 times in any 20 spins. Long-run odds stay equal.
const WINDOW = 20
const ODDS = [1, 1, 0.1, 0]

export function draw(pool, n) {
  const out = []
  for (let k = 0; k < n; k++) {
    const recent = out.slice(-WINDOW)
    const w = pool.map((g) => ODDS[Math.min(recent.filter((x) => x === g).length, ODDS.length - 1)])
    let r = (rand(1e9) / 1e9) * w.reduce((a, b) => a + b)
    let i = 0
    while (i < w.length - 1 && r >= w[i]) r -= w[i++]
    out.push(pool[i])
  }
  return out
}
