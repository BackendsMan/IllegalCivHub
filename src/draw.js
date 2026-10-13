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

// Balanced: draw from a shuffled bag, refill when empty. Every gun comes up equally often (counts differ by at most 1)
// and none repeats back-to-back across a refill.
export function draw(pool, n) {
  const out = []
  let bag = []
  while (out.length < n) {
    if (!bag.length) {
      bag = shuffle(pool)
      if (bag[0] === out.at(-1) && bag.length > 1) bag.push(bag.shift())
    }
    out.push(bag.shift())
  }
  return out
}
