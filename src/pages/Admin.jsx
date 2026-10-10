import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router'
import { signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { CAN_DELETE } from '../admins'
import { QUESTIONS } from '../questions'
import { useAuth } from '../useAuth'
import { Icon, Page, ThemeToggle, btnGhost, card, hover, stamp } from '../ui'

const FILTERS = ['pending', 'approved', 'denied', 'all']

const BADGE = {
  pending: 'bg-zinc-500/15 text-zinc-300',
  approved: 'bg-active/15 text-active',
  denied: 'bg-accent/15 text-accent',
}


function Thread({ t, me }) {
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!confirm(`Delete "${t.groupName}" permanently? This can't be undone.`)) return
    setBusy(true)
    try {
      await deleteDoc(doc(db, 'threads', t.id))
    } catch (e) {
      alert(`Failed: ${e.message}`)
      setBusy(false)
    }
  }

  async function review(status) {
    if (!confirm(`${status === 'approved' ? 'Approve' : 'Deny'} "${t.groupName}"? This can't be undone.`)) return
    setBusy(true)
    try {
      // firestore.rules require reviewedBy to match the signed-in admin's name, so this log can't be spoofed.
      // decisions/{id} is the public status-only copy the applicant polls (they can't read the thread itself).
      const batch = writeBatch(db)
      batch.update(doc(db, 'threads', t.id), { status, reviewedBy: me, reviewedAt: serverTimestamp() })
      batch.set(doc(db, 'decisions', t.id), { status, reviewedAt: serverTimestamp() })
      await batch.commit()
    } catch (e) {
      alert(`Failed: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className={`${card} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight break-words">{t.groupName}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {t.groupType} · thread-holder <span className="text-zinc-300">{t.threadHolder}</span> · submitted {stamp(t.createdAt)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${BADGE[t.status]}`}>{t.status}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        {[
          ['Prior strikes', t.priorStrikes],
          ['TFB punishments', t.tfbPunishments],
        ].map(([label, v]) => (
          <span key={label} className={`rounded-md px-2.5 py-1 ${v === 'Yes' ? 'bg-war/15 text-war' : 'bg-white/5 text-zinc-400'}`}>
            {label}: {v}
          </span>
        ))}
      </div>

      <details className="group mt-5 rounded-lg border border-white/5 bg-ink-950/40">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-300">
          Full application
          <Icon name="chevron" className="size-4 text-zinc-500 transition group-open:rotate-180" />
        </summary>
        <dl className="divide-y divide-white/5 px-4 pb-2 text-sm">
          {QUESTIONS.map((q) => (
            <div key={q.id} className="py-3">
              <dt className="flex gap-3 text-zinc-500">
                <span className="font-mono text-xs text-accent/80">{String(q.n).padStart(2, '0')}</span>
                {q.label}
              </dt>
              <dd className="mt-1 pl-8 leading-relaxed break-words whitespace-pre-line text-zinc-200">
                {q.type === 'link' ? (
                  <a href={t[q.id]} target="_blank" rel="noreferrer" className="text-accent hover:underline">{t[q.id]}</a>
                ) : (
                  t[q.id]
                )}
              </dd>
            </div>
          ))}
        </dl>
      </details>

      <div className="mt-4">
        <a href={t.threadLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium break-all text-accent hover:underline">
          <Icon name="link" className="size-4 shrink-0" /> Thread clip: {t.threadLink}
        </a>
      </div>

      <div className="mt-6 border-t border-white/5 pt-5">
        {t.status === 'pending' ? (
          <div className="flex flex-wrap gap-3">
            <motion.button {...hover} disabled={busy} onClick={() => review('approved')} className="inline-flex items-center gap-2 rounded-lg bg-active/90 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-active disabled:opacity-40">
              <Icon name="check" className="size-4" /> Approve
            </motion.button>
            <motion.button {...hover} disabled={busy} onClick={() => review('denied')} className="inline-flex items-center gap-2 rounded-lg border border-accent/50 px-5 py-2.5 text-sm font-bold text-accent transition hover:bg-accent/10 disabled:opacity-40">
              <Icon name="x" className="size-4" /> Deny
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-zinc-300">
              <Icon name={t.status === 'approved' ? 'check' : 'x'} className={`size-4 ${t.status === 'approved' ? 'text-active' : 'text-accent'}`} />
              <span>
                <span className="capitalize">{t.status}</span> by <strong className="text-white">{t.reviewedBy}</strong> on {stamp(t.reviewedAt)}
              </span>
            </p>
            {me === CAN_DELETE && (
              <button disabled={busy} onClick={remove} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:border-accent/50 hover:text-accent disabled:opacity-40">
                <Icon name="x" className="size-4" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </motion.article>
  )
}

export default function Admin() {
  const user = useAuth()
  const [threads, setThreads] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('pending')

  useEffect(
    () => onSnapshot(query(collection(db, 'threads'), orderBy('createdAt', 'desc')), (s) => setThreads(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => setError(e.message)),
    [],
  )

  const count = (f) => threads?.filter((t) => f === 'all' || t.status === f).length ?? 0
  const shown = threads?.filter((t) => filter === 'all' || t.status === filter) ?? []

  return (
    <Page>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
              <Icon name="back" className="size-4" /> Back to hub
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Management Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Signed in as <span className="font-semibold text-zinc-300">{user?.displayName}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <button onClick={() => signOut(auth)} className={btnGhost}>Sign out</button>
          </div>
        </header>

        <nav className="mt-8 flex gap-1 overflow-x-auto rounded-xl bg-ink-900/80 p-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`relative flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold capitalize transition ${filter === f ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {filter === f && <motion.span layoutId="filter" className="absolute inset-0 rounded-lg bg-ink-700" />}
              <span className="relative">
                {f} <span className="font-mono text-xs text-zinc-500">{count(f)}</span>
              </span>
            </button>
          ))}
        </nav>

        <section className="mt-6 space-y-4">
          {error && <p className="text-sm text-accent">Couldn't load threads: {error}</p>}
          {threads === null && !error && <p className="text-sm text-zinc-500">Loading threads…</p>}
          {threads && shown.length === 0 && <p className={`${card} p-10 text-center text-zinc-500`}>No {filter === 'all' ? '' : filter} threads.</p>}
          <AnimatePresence mode="popLayout">
            {shown.map((t) => (
              <Thread key={t.id} t={t} me={user?.displayName} />
            ))}
          </AnimatePresence>
        </section>
      </div>
    </Page>
  )
}
