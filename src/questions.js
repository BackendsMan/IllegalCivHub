// Thread application questions. Shown on /submit and in the admin dashboard.
// If you add/rename an id or change a limit, update firestore.rules to match.
// type: choice | short | long | link   (min/max = character limits; pattern = must match instead)

const yesNo = ['Yes', 'No']

export const QUESTIONS = [
  {
    id: 'groupType', type: 'choice', options: ['Car Group', 'Fraud Group', 'Weapon Group', 'Drug Group'],
    label: 'Please select what your Illegal Civilian Group will be primarily based around.',
    hint: 'Choose the concept, identity, or foundation that best represents your group and the type of roleplay you intend to create.',
  },
  {
    id: 'rpExperience', type: 'long', min: 20, max: 3000,
    label: 'How long have you been involved in roleplay? Please provide a detailed explanation of your roleplay experience and explain what “roleplay” means to you in your own words.',
    hint: 'Your response should go beyond simply stating how many months or years you have been involved.',
  },
  {
    id: 'leadershipExperience', type: 'long', min: 2, max: 3000,
    label: 'Do you have any previous experience owning, leading, or managing an Illegal Civilian Group? If yes, please describe your experience in detail.',
    hint: 'If applicable, explain what group(s) you owned or helped manage, how long you were involved, what your responsibilities were.',
  },
  {
    id: 'priorStrikes', type: 'choice', options: yesNo,
    label: 'If you have previously owned an Illegal Civilian Group, have you ever received a strike, warning, or had your group closed?',
    hint: 'We have logs so do not lie.',
  },
  {
    id: 'tfbPunishments', type: 'choice', options: yesNo,
    label: 'Have you received any punishments in TFB?',
    hint: "We have logs so don't lie.",
  },
  {
    id: 'illegalCivDefinition', type: 'long', min: 20, max: 3000,
    label: 'Define Illegal Civilian Roleplay.',
    hint: 'Explain what Illegal Civilian Roleplay means to you and how you believe it should be portrayed within TFB.',
  },
  { id: 'groupName', type: 'short', min: 1, max: 80, label: 'Illegal Civilian Group Name' },
  {
    id: 'threadLink', type: 'link', max: 300,
    // Any web link (Streamable, YouTube, Medal, Google Drive, Twitch…). "https://" is optional; it's added on submit.
    pattern: /^(https?:\/\/)?[^\s/]+\.[^\s/]{2,}(\/\S*)?$/i,
    normalize: (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`),
    placeholder: 'https://streamable.com/abc123',
    error: 'That doesn’t look like a link. Paste the full link to your clip.',
    label: 'Provide a streamable link of your Illegal Civilian Group Thread.',
    hint: 'Any video link works: Streamable, YouTube, Medal, Google Drive, Twitch, etc.',
  },
  { id: 'threadHolder', type: 'short', min: 1, max: 100, label: 'Discord of Thread-holder.' },
  {
    id: 'threadHolderId', type: 'short', max: 20,
    pattern: /^\d{17,20}$/,
    placeholder: '123456789012345678',
    error: 'Must be the 17–20 digit Discord user ID, not a username.',
    label: "Thread-holder's Discord User ID.",
    hint: 'Discord → Settings → Advanced → turn on Developer Mode. Then right-click the thread-holder → Copy User ID. Used to @ them when the thread is approved.',
  },
  { id: 'leadership', type: 'short', min: 1, max: 300, label: 'Leadership' },
  { id: 'highCouncil', type: 'short', min: 1, max: 300, label: 'High-Council' },
  {
    id: 'discordInvite', type: 'link', max: 200,
    pattern: /^https:\/\/(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+$/,
    placeholder: 'https://discord.gg/…',
    error: 'Must be a discord.gg or discord.com/invite link.',
    label: "Provide the link to your Illegal Civilian Group's Discord server.",
  },
  {
    id: 'members', type: 'long', min: 2, max: 2000, rows: 3,
    label: 'List EVERY member currently within your Illegal Civilian Group.',
    hint: 'Provide the Discord name of every individual who is currently a member of your Illegal Civilian Group.',
  },
  {
    id: 'uniqueness', type: 'long', min: 20, max: 3000,
    label: 'What makes the Illegal Civilian Group you are applying for unique, and what will it contribute to the server?',
    hint: 'Explain in detail what sets your group apart from other Illegal Civilian Groups and what you intend to bring to TFB.',
  },
  {
    id: 'goals', type: 'long', min: 20, max: 3000,
    label: 'What are your long-term goals for your Illegal Civilian Group?',
    hint: 'Explain where you see your group progressing over time and what you hope to accomplish if your application is approved.',
  },
  {
    id: 'rulesEnforcement', type: 'long', min: 20, max: 3000,
    label: 'How will your group ensure that all members understand and follow the server rules and proper escalation?',
    hint: 'Explain the methods and expectations your leadership will use to educate, monitor, and holding members accountable.',
  },
  {
    id: 'roeUnderstanding', type: 'long', min: 20, max: 3000,
    label: 'Does every member within your Illegal Civilian Group understand the Rules of Engagement (ROE) and proper escalation? Explain how this is enforced.',
    hint: 'Go into detail, non-detailed answers will result in a denial.',
  },
].map((q, i) => ({ ...q, n: i + 1 }))

export const STEPS = [
  { title: 'Background', from: 1, to: 6 },
  { title: 'Group', from: 7, to: 14 },
  { title: 'Vision', from: 15, to: 18 },
]

export const questionsFor = (step) => QUESTIONS.filter((q) => q.n >= step.from && q.n <= step.to)

export function isValid(q, value) {
  const v = (value ?? '').trim()
  if (q.type === 'choice') return q.options.includes(v)
  if (q.pattern) return q.pattern.test(v)
  return v.length >= q.min && v.length <= q.max
}
