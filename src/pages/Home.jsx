import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../useAuth'
import { Icon, LOGO, MotionLink, Page, ThemeToggle, backgrounds, btnGhost, btnPrimary, hover } from '../ui'

const ACTIONS = [
  { to: '/roe', label: 'Browse Illegal Civ ROE', icon: 'shield', primary: true },
  { to: '/submit', label: 'Submit Thread Submissions', icon: 'file' },
  { to: '/map', label: 'Look at Illegal Civ Turfs', icon: 'map' },
]

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

// Three photos side by side; every 8s the whole row swaps to the next three (wrapping around the folder).
const PER_ROW = 3
const ROWS = Math.ceil(backgrounds.length / PER_ROW)

function Slideshow() {
  const [row, setRow] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setRow((r) => (r + 1) % ROWS), 8000)
    return () => clearInterval(t)
  }, [])
  return (
    <div aria-hidden className="absolute inset-0 -z-10 grid grid-cols-3 gap-px overflow-hidden bg-black">
      {Array.from({ length: PER_ROW }, (_, col) => {
        const i = (row * PER_ROW + col) % backgrounds.length
        return (
          <div key={col} className="relative overflow-hidden bg-ink-950">
            <AnimatePresence>
              <motion.img
                key={i}
                src={backgrounds[i]}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1, transition: { opacity: { duration: 1.4, delay: col * 0.25 }, scale: { duration: 10, ease: 'linear' } } }}
                exit={{ opacity: 0, transition: { duration: 1.4, delay: col * 0.25 } }}
              />
            </AnimatePresence>
          </div>
        )
      })}
      {/* Readability: dim everything, extra shade behind the centered text, vignette top/bottom */}
      <div className="absolute inset-0 bg-ink-950/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-ink-950)_0%,transparent_65%)] opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/50" />
    </div>
  )
}

export default function Home() {
  const user = useAuth()
  const [pending, setPending] = useState(false)
  useEffect(() => {
    if (!user) return setPending(false)
    return onSnapshot(query(collection(db, 'threads'), where('status', '==', 'pending'), limit(1)), (s) => setPending(!s.empty), () => setPending(false))
  }, [user])
  return (
    <Page className="flex flex-col overflow-hidden">
      <Slideshow />

      <header className="flex justify-end gap-2 p-4 sm:p-6">
        <ThemeToggle />
        <MotionLink {...hover} to={user ? '/admin' : '/login'} className={`${btnGhost} px-4 py-2.5`}>
          <Icon name={user ? 'grid' : 'lock'} className="size-4" />
          {pending && (
            <span className="relative flex size-2.5" role="img" aria-label="New threads to review">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative size-2.5 rounded-full bg-accent shadow-glow" />
            </span>
          )}
          {user ? 'Dashboard' : 'Management Login'}
        </MotionLink>
      </header>

      <motion.section
        variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col items-center justify-center px-4 pb-20 text-center"
      >
        <motion.img variants={rise} src={LOGO} alt="TFB logo" className="size-44 object-contain drop-shadow-[0_10px_40px_rgba(255,80,20,0.35)] sm:size-60" />
        <motion.h1 variants={rise} className="mt-8 text-5xl leading-[0.95] font-black tracking-[-0.045em] text-balance sm:text-7xl lg:text-8xl">
          Illegal Civ Hub
        </motion.h1>
        <motion.p variants={rise} className="mt-5 max-w-3xl text-sm leading-relaxed text-balance text-zinc-300 sm:text-base">
          The home of the Five Borough Illegal Civilian Scheme. Read the rules, submit your group's thread, and see where every crew stands on the map.
        </motion.p>
        <motion.nav variants={rise} className="mt-10 grid w-full max-w-sm gap-3 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center">
          {ACTIONS.map((a) => (
            <MotionLink key={a.to} {...hover} to={a.to} className={`${a.primary ? btnPrimary : btnGhost} px-6 py-4 text-[15px]`}>
              <Icon name={a.icon} />
              {a.label}
            </MotionLink>
          ))}
        </motion.nav>
      </motion.section>

      <footer className="px-4 pb-6 text-center text-xs tracking-[0.2em] text-zinc-600 uppercase">Five Borough 5.0 · Illegal Civilian Management</footer>
    </Page>
  )
}
