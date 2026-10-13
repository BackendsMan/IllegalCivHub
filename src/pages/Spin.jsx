import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { draw, shuffle } from '../draw'
import { Icon, Page, PageHeader, btnGhost, btnPrimary, card, field } from '../ui'

const TIERS = {
  'Tier 1': ['Canik TP9', 'Glock 45', 'Glock 19x', 'Glock G17 Gen5', 'Glock 19', 'Glock 43', 'Glock 23', 'HK45', 'Walther P88', 'Sig P320', 'Olive G17'],
  'Tier 1.5': ['FN 57 1.0', '1911', 'Olive G19x', 'Glock 45', 'Glock 19x', 'Glock G17 Gen5', 'Glock 19', 'Glock 43', 'Glock 23', 'HK45'],
  'Tier 2': ['FN 57 1.0', 'Glock 45', 'Glock 19', 'Olive G19x', 'Glock 43 Mos', 'Glock 45 Mos', 'FN 57 2.0', 'FNX 45', '1911'],
}
const MAX = 100
const SLOTS = 7 // reel tiles; the middle one is the marker

// Image per gun in public/guns A gun with no entry gets a name plate.
const IMG = {
  'Canik TP9': 'canik-tp9', 'Glock 45': 'glock-45', 'Glock 19x': 'glock-19x', 'Glock G17 Gen5': 'glock-17-gen5',
  'Glock 19': 'glock-19', 'Glock 43': 'glock-43', 'HK45': 'hk45', 'Walther P88': 'walther-p88', 'Sig P320': 'sig-p320',
  'Olive G17': 'olive-g17', 'Glock 23': 'glock-23', 'Glock 43 Mos': 'glock-43-mos', 'Glock 45 Mos': 'glock-45-mos',
  'FN 57 1.0': 'fn-57-1', 'FN 57 2.0': 'fn-57-2', 'FNX 45': 'fnx-45', 'Olive G19x': 'olive-g19x', '1911': '1911',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function Tile({ name, active, win }) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-xl border bg-ink-900 transition-all duration-100 ${win ? 'scale-105 border-accent shadow-glow' : active ? 'border-accent/70' : 'border-white/10'}`}>
      {name && IMG[name] ? (
        <img src={`${import.meta.env.BASE_URL}guns/${IMG[name]}.png`} alt={name} className="size-full object-cover" draggable="false" />
      ) : (
        <div className="grid size-full place-items-center p-2 text-center text-xs font-bold text-zinc-400">{name}</div>
      )}
    </div>
  )
}

export default function Spin() {
  const [tier, setTier] = useState('Tier 1')
  const [count, setCount] = useState('3')
  const [results, setResults] = useState([])
  const [strip, setStrip] = useState(null) // { order, at }
  const [landed, setLanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const skip = useRef(false)
  const dead = useRef(false)
  useEffect(() => {
    dead.current = false
    return () => (dead.current = true)
  }, [])

  const pool = TIERS[tier]
  const n = Math.min(MAX, Math.max(1, parseInt(count) || 1))
  const catalog = Object.entries(TIERS).reduce((m, [t, guns]) => (guns.forEach((g) => (m[g] = [...(m[g] || []), t])), m), {})

  async function spin() {
    const targets = draw(pool, n)
    skip.current = false
    setBusy(true)
    setResults([])
    const hops = n <= 5 ? 24 : 12
    for (let i = 0; i < n && !dead.current; i++) {
      const order = shuffle(pool)
      let at = (order.indexOf(targets[i]) - hops + order.length * 40) % order.length
      setLanded(false)
      setProgress(i + 1)
      for (let h = 0; h <= hops; h++) {
        setStrip({ order, at })
        if (h === hops) break
        at = (at + 1) % order.length
        if (!skip.current) await sleep(h < hops - 10 ? 55 : 80 + (h - (hops - 10)) * 38)
      }
      setLanded(true)
      setResults((r) => [...r, targets[i]])
      if (!skip.current) await sleep(n <= 5 ? 700 : 150)
    }
    setBusy(false)
  }

  const slots = strip && Array.from({ length: SLOTS }, (_, k) => strip.order[(strip.at + k - 3 + strip.order.length * 4) % strip.order.length])
  const tally = Object.entries(results.reduce((m, g) => ((m[g] = (m[g] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1])

  return (
    <Page className="px-4 pb-20 pt-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <PageHeader eyebrow="Weapon Spin" title="Random wheel">
          Pick a tier, choose how many times to spin, and let it roll. Every gun in the tier comes up evenly.
        </PageHeader>

        <div className="mx-auto grid max-w-xl grid-cols-3 gap-1 rounded-xl border border-white/10 bg-ink-900/70 p-1">
          {Object.entries(TIERS).map(([t, g]) => (
            <button key={t} disabled={busy} onClick={() => { setTier(t); setResults([]); setStrip(null) }} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition disabled:opacity-60 ${tier === t ? 'bg-accent text-on-accent shadow-glow' : 'text-zinc-400 hover:text-white'}`}>
              {t}
              <span className="block text-[11px] font-medium opacity-70">{g.length} guns</span>
            </button>
          ))}
        </div>

        <section className={`${card} mt-6 p-4 sm:p-6`}>
          <div className="relative pt-3">
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {slots
                ? slots.map((g, k) => <Tile key={k} name={g} win={k === 3 && landed} active={k === 3} />)
                : pool.slice(0, SLOTS).map((g, k) => <Tile key={g} name={g} active={k === 3} />)}
            </div>
            <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 size-0 -translate-x-1/2 border-x-8 border-t-[10px] border-x-transparent border-t-accent" />
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-center gap-3">
            <label className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              Spins for {tier} (1–{MAX})
              <div className="mt-1 flex gap-2">
                <button disabled={busy} onClick={() => setCount(String(Math.max(1, n - 1)))} className={`${btnGhost} px-4`}>−</button>
                <input type="number" min="1" max={MAX} disabled={busy} value={count} onChange={(e) => setCount(e.target.value)} className={`${field} w-24 text-center`} />
                <button disabled={busy} onClick={() => setCount(String(Math.min(MAX, n + 1)))} className={`${btnGhost} px-4`}>+</button>
              </div>
            </label>
            <div className="flex gap-1.5">
              {[1, 3, 5, 10].map((v) => (
                <button key={v} disabled={busy} onClick={() => setCount(String(v))} className={`${btnGhost} px-3 py-3 ${n === v ? 'border-accent/60' : ''}`}>{v}</button>
              ))}
            </div>
            <button onClick={spin} disabled={busy} className={`${btnPrimary} min-w-48 px-8 py-3.5 text-base`}>
              <Icon name="dice" className={`size-5 ${busy ? 'animate-spin' : ''}`} />
              {busy ? `Spinning ${progress}/${n}…` : `Spin ${n}×`}
            </button>
            {busy && n > 1 && <button onClick={() => (skip.current = true)} className={`${btnGhost} px-5 py-3.5`}>Skip animation</button>}
          </div>
        </section>

        {results.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xs font-bold tracking-[0.2em] text-accent uppercase">Your results · {tier}</h2>
              {!busy && n > 1 && <p className="text-xs text-zinc-500">{tally.map(([g, c]) => `${g} ×${c}`).join(' · ')}</p>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {results.map((g, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 14, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`${card} p-2.5`}>
                  <Tile name={g} />
                  <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
                    <span className="truncate text-sm font-bold">{g}</span>
                    <span className="shrink-0 text-xs text-zinc-500">#{i + 1}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14">
          <p className="text-center text-xs font-bold tracking-[0.25em] text-accent uppercase">Weapon catalog</p>
          <h2 className="mt-2 text-center font-display text-2xl font-extrabold uppercase sm:text-3xl">What you can spin for in {tier}</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pool.map((g) => (
              <div key={g} className={`${card} p-2.5`}>
                <Tile name={g} />
                <div className="mt-2.5 px-1">
                  <div className="text-sm font-bold">{g}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {catalog[g].map((t) => (
                      <span key={t} className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${t === tier ? 'border-accent/50 text-accent' : 'border-white/10 text-zinc-500'}`}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Page>
  )
}
