// Posts threads to the Illegal Civ Discord. Run by .github/workflows/discord.yml.
// - SUBMISSIONS_WEBHOOK: every submitted thread, as a summary embed that pings management.
// - APPROVED_WEBHOOK (forum channel): a new forum post per approved thread, titled "<group> - <Type> Tier 1", body = clip link + @thread-holder.
// Also needs FIREBASE_SERVICE_ACCOUNT (service account key JSON). All three are GitHub secrets.
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { QUESTIONS } from '../src/questions.js'

// Threads from before this went live are skipped so old ones don't flood the channels.
const SINCE = new Date('2026-10-09T21:30:00-04:00')
const DASHBOARD = 'https://backendsman.github.io/IllegalCivHub/#/admin'
// New groups start at Tier 1; this is the suffix on their forum post title ("SOA - Weapons Tier 1").
const TIER = { 'Car Group': 'Cars Tier 1', 'Fraud Group': 'Fraud Tier 1', 'Weapon Group': 'Weapons Tier 1', 'Drug Group': 'Drugs Tier 1' }
// Illegal Civ Management roles pinged on every new submission.
const MANAGEMENT_ROLES = ['1551557569053597751', '1551557569053597749', '1551557569053597748', '1551557569053597747']

const db = getFirestore(initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) }))
const clip = (v, n = 1024) => (String(v).length > n ? `${String(v).slice(0, n - 1)}…` : String(v))

// Quick facts as fields, then each written answer (first sentence of the question + clipped answer).
// Stays under Discord's 6000-char embed limit; the dashboard has the full text.
function submissionMessage(t) {
  const id = t.threadHolderId
  const fields = [
    ['Group', t.groupName],
    ['Type', t.groupType],
    ['Thread-holder', id ? `<@${id}>\n${t.threadHolder}` : t.threadHolder],
    ['Leadership', t.leadership],
    ['High council', t.highCouncil],
    ['Strikes / punishments', `${t.priorStrikes} / ${t.tfbPunishments}`],
    ['Thread clip', t.threadLink],
    ['Group Discord', t.discordInvite],
  ].map(([name, value]) => ({ name, value: clip(value, 300), inline: true }))

  let description = ''
  for (const q of QUESTIONS.filter((q) => q.type === 'long')) {
    const part = `**${q.n}. ${q.label.split(/(?<=[?.])\s/)[0]}**\n${clip(t[q.id], 350)}\n\n`
    if (description.length + part.length > 3600) break
    description += part
  }
  description += `[Open the full application on the Management Dashboard](${DASHBOARD})`

  return {
    content: MANAGEMENT_ROLES.map((r) => `<@&${r}>`).join(' '),
    allowed_mentions: { roles: MANAGEMENT_ROLES },
    embeds: [
      {
        author: { name: 'New thread submission' },
        title: clip(`TFB | Illegal Civilian Group Application: ${t.groupName}`, 256),
        url: DASHBOARD,
        color: 0xf8400c,
        fields,
        description,
        footer: { text: 'Submitted' },
        timestamp: t.createdAt.toDate().toISOString(),
      },
    ],
  }
}

async function post(webhook, body) {
  const res = await fetch(`${webhook}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allowed_mentions: { parse: [] }, ...body }), // applicant text can't @everyone unless body allows it
  })
  if (!res.ok) throw new Error(`Discord ${res.status}: ${await res.text()}`) // next run retries
}

// ponytail: rescans every thread since SINCE each run; fine for hundreds, add flag indexes if it gets slow.
const snap = await db.collection('threads').where('createdAt', '>=', SINCE).get()
for (const d of snap.docs) {
  const t = d.data()

  if (!t.postedSubmission) {
    await post(process.env.SUBMISSIONS_WEBHOOK, submissionMessage(t))
    await d.ref.update({ postedSubmission: true })
    console.log(`submission posted: ${t.groupName}`)
  }

  if (t.status === 'approved' && !t.postedForum) {
    // thread_name makes the webhook open a new forum post; Discord embeds the clip link on its own.
    // Only the thread-holder's ID is allowed to ping (older threads have no ID, so no ping).
    const id = t.threadHolderId
    await post(process.env.APPROVED_WEBHOOK, {
      thread_name: `${t.groupName.slice(0, 80)} - ${TIER[t.groupType]}`,
      content: id ? `${t.threadLink}\n<@${id}>` : t.threadLink,
      allowed_mentions: { users: id ? [id] : [] },
    })
    await d.ref.update({ postedForum: true })
    console.log(`forum post created: ${t.groupName}`)
  }
}
