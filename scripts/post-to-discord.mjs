// Posts threads to the Illegal Civ Discord. Run by .github/workflows/discord.yml.
// - SUBMISSIONS_WEBHOOK: every submitted thread, as a summary embed.
// - APPROVED_WEBHOOK (forum channel): a new forum post per approved thread, titled with the group name, body = clip link + @thread-holder.
// Also needs FIREBASE_SERVICE_ACCOUNT (service account key JSON). All three are GitHub secrets.
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Threads from before this went live are skipped so old ones don't flood the channels.
const SINCE = new Date('2026-10-09T21:30:00-04:00')
const DASHBOARD = 'https://backendsman.github.io/IllegalCivHub/#/admin'

const db = getFirestore(initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) }))
const clip = (v, n = 1024) => (String(v).length > n ? `${String(v).slice(0, n - 1)}…` : String(v))

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
    await post(process.env.SUBMISSIONS_WEBHOOK, {
      embeds: [
        {
          title: clip(`New thread: ${t.groupName}`, 256),
          url: DASHBOARD,
          color: 0xf8400c,
          timestamp: t.createdAt.toDate().toISOString(),
          fields: [
            ['Group type', t.groupType],
            ['Thread-holder', t.threadHolder],
            ['Leadership', t.leadership],
            ['High council', t.highCouncil],
            ['Prior strikes / TFB punishments', `${t.priorStrikes} / ${t.tfbPunishments}`],
            ['Thread clip', t.threadLink],
          ].map(([name, value]) => ({ name, value: clip(value), inline: name.length < 15 })),
          footer: { text: 'Review it on the Management Dashboard' },
        },
      ],
    })
    await d.ref.update({ postedSubmission: true })
    console.log(`submission posted: ${t.groupName}`)
  }

  if (t.status === 'approved' && !t.postedForum) {
    // thread_name makes the webhook open a new forum post; Discord embeds the clip link on its own.
    // Only the thread-holder's ID is allowed to ping (older threads have a username there, so no ping).
    const id = /^\d{17,20}$/.test(t.threadHolder) ? t.threadHolder : null
    await post(process.env.APPROVED_WEBHOOK, {
      thread_name: t.groupName.slice(0, 100),
      content: id ? `${t.threadLink}\n<@${id}>` : t.threadLink,
      allowed_mentions: { users: id ? [id] : [] },
    })
    await d.ref.update({ postedForum: true })
    console.log(`forum post created: ${t.groupName}`)
  }
}
