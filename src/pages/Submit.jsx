import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db, firebaseReady } from '../firebase'
import { QUESTIONS, STEPS, isValid, questionsFor } from '../questions'
import { Icon, Notice, Page, PageHeader, backgrounds, btnGhost, btnPrimary, card, field, hover, stamp } from '../ui'

function Question({ q, children, count, error }) {
  return (
    <div role="group" aria-labelledby={`l-${q.id}`} id={`q-${q.id}`} className={`scroll-mt-24 rounded-xl p-4 transition-colors sm:p-5 ${error ? 'bg-accent/[0.06] ring-1 ring-accent/40' : ''}`}>
      <h3 id={`l-${q.id}`} className="mb-1 flex gap-3 text-[15px] leading-snug font-semibold text-zinc-100">
        <span className="mt-px font-mono text-xs text-accent">{String(q.n).padStart(2, '0')}</span>
        <span>
          {q.label} <span className="text-accent">*</span>
        </span>
      </h3>
      {q.hint && <p className="mb-3 pl-8 text-xs leading-relaxed text-zinc-500">{q.hint}</p>}
      <div className={q.hint ? '' : 'mt-3'}>{children}</div>
      {count}
      {error && <p className="mt-2 text-sm font-medium text-accent">{error}</p>}
    </div>
  )
}

// This browser's latest application: { id, groupName }.
// ponytail: per-browser limit, clearing site data gets around it; tie to a Discord login if spam gets real.
const MINE = 'myThread'
function loadMine() {
  try {
    return JSON.parse(localStorage.getItem(MINE))
  } catch {
    return null
  }
}
function saveMine(v) {
  try {
    v ? localStorage.setItem(MINE, JSON.stringify(v)) : localStorage.removeItem(MINE)
  } catch {}
}

const VIEWS = {
  pending: { icon: 'file', tone: 'bg-zinc-500/15 text-zinc-300', title: 'Application under review' },
  approved: { icon: 'check', tone: 'bg-active/15 text-active', title: 'Application approved' },
  denied: { icon: 'x', tone: 'bg-accent/15 text-accent', title: 'Application denied' },
}

export default function Submit() {
  const [answers, setAnswers] = useState({})
  const [tried, setTried] = useState(false)
  const [status, setStatus] = useState('idle') // idle | saving | error
  const [error, setError] = useState('')
  const [mine, setMine] = useState(loadMine)
  const [decision, setDecision] = useState() // undefined loading, null still pending, else { status, reviewedAt }

  useEffect(() => {
    if (!mine || !db) return
    return onSnapshot(doc(db, 'decisions', mine.id), (s) => setDecision(s.exists() ? s.data() : null), () => setDecision(null))
  }, [mine?.id])

  function startNew() {
    saveMine(null)
    setMine(null)
    setDecision(undefined)
    setAnswers({})
    setTried(false)
    setStatus('idle')
  }

  const set = (id) => (e) => setAnswers((a) => ({ ...a, [id]: e.target.value }))
  const busy = status === 'saving'
  const invalid = QUESTIONS.filter((q) => !isValid(q, answers[q.id]))

  function errorFor(q) {
    if (!tried || isValid(q, answers[q.id])) return null
    const v = (answers[q.id] ?? '').trim()
    if (!v) return q.type === 'choice' ? 'Pick an option.' : 'This question is required.'
    if (q.type === 'link') return q.error
    return `Too short. At least ${q.min} characters.`
  }

  async function submit() {
    setTried(true)
    if (invalid.length) {
      document.getElementById(`q-${invalid[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    setError('')
    setStatus('saving')
    try {
      const ref = await addDoc(collection(db, 'threads'), {
        ...Object.fromEntries(QUESTIONS.map((q) => [q.id, (q.normalize ?? String)(answers[q.id].trim())])),
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      const v = { id: ref.id, groupName: answers.groupName.trim() }
      saveMine(v)
      setDecision(undefined)
      setMine(v)
      window.scrollTo(0, 0)
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  function renderInput(q) {
    const v = answers[q.id] ?? ''
    if (q.type === 'choice')
      return (
        <div className={`grid gap-2 ${q.options.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
          {q.options.map((o) => (
            <label key={o} className="cursor-pointer">
              <input type="radio" name={q.id} value={o} checked={v === o} onChange={set(q.id)} className="peer sr-only" />
              <span className="flex items-center gap-3 rounded-lg border border-white/10 bg-ink-900/80 px-4 py-3 text-sm font-medium text-zinc-400 transition peer-checked:border-accent/70 peer-checked:bg-accent/10 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 hover:border-white/25">
                <span className={`size-3.5 shrink-0 rounded-full border-2 ${v === o ? 'border-accent bg-accent' : 'border-zinc-600'}`} />
                {o}
              </span>
            </label>
          ))}
        </div>
      )
    if (q.type === 'long')
      return <textarea rows={q.rows ?? 5} maxLength={q.max} className={field} value={v} onChange={set(q.id)} />
    return (
      <>
        <input className={field} maxLength={q.max} value={v} onChange={set(q.id)} placeholder={q.placeholder} />
        {!tried && q.type === 'link' && v && !isValid(q, v) && <p className="mt-2 text-sm text-accent">{q.error}</p>}
      </>
    )
  }

  if (mine) {
    if (decision === undefined) return <Page bg={backgrounds[2] ?? backgrounds[0]} />
    const view = VIEWS[decision?.status ?? 'pending']
    return (
      <Page bg={backgrounds[2] ?? backgrounds[0]} className="grid place-items-center px-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`${card} max-w-md p-10 text-center`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.15 }}
            className={`mx-auto grid size-16 place-items-center rounded-full ${view.tone}`}
          >
            <Icon name={view.icon} className="size-8" />
          </motion.div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-accent">Your thread status</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{view.title}</h1>
          <p className="mt-3 text-zinc-400">
            {decision
              ? `${mine.groupName} was ${decision.status} on ${stamp(decision.reviewedAt)}. You can submit a new application.`
              : `Illegal Civ Management is reviewing ${mine.groupName}. You can submit another application once this one is approved or denied.`}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className={btnGhost}>Back to hub</Link>
            {decision && <button onClick={startNew} className={btnPrimary}>Submit a new application</button>}
          </div>
        </motion.div>
      </Page>
    )
  }

  return (
    <Page bg={backgrounds[2] ?? backgrounds[0]}>
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-20 sm:px-8">
        <PageHeader eyebrow="Thread Submissions" title="Illegal Civ Group Application">
          Every question is required. Non-detailed answers will result in a denial.
        </PageHeader>

        {!firebaseReady && <div className="mb-6"><Notice>Firebase isn't configured yet. Add <code>.env</code> (see README) before submitting.</Notice></div>}

        <div className="space-y-6">
          {STEPS.map((step, si) => (
            <motion.section
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + si * 0.08, duration: 0.5 }}
              className={`${card} px-5 py-8 sm:px-10 sm:py-10`}
            >
              <div className="mb-4 flex items-center gap-4">
                <span className="font-mono text-sm font-semibold text-accent">{String(si + 1).padStart(2, '0')}</span>
                <h2 className="font-display text-lg font-extrabold uppercase sm:text-xl">{step.title}</h2>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <div className="-mx-4 space-y-4 sm:-mx-5">
                {questionsFor(step).map((q) => (
                  <Question
                    key={q.id}
                    q={q}
                    error={errorFor(q)}
                    count={q.type === 'long' && <p className="mt-1.5 text-right text-xs text-zinc-600">{(answers[q.id] ?? '').length}/{q.max}{q.min > 2 && ` · min ${q.min}`}</p>}
                  >
                    {renderInput(q)}
                  </Question>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          {tried && invalid.length > 0 && (
            <p className="text-sm text-accent">{invalid.length} question{invalid.length > 1 ? 's need' : ' needs'} an answer. Scroll up to the highlighted ones.</p>
          )}
          {status === 'error' && <p className="text-sm text-accent">Submission failed: {error}</p>}
          <motion.button {...hover} onClick={submit} disabled={busy || !firebaseReady} className={`${btnPrimary} w-full max-w-sm py-4 text-base`}>
            {busy ? 'Submitting…' : 'Submit application'}
          </motion.button>
        </div>
      </div>
    </Page>
  )
}
