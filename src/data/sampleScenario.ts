import type { Scenario } from '@/types/scenario'

// Hardcoded sample scenario for PBI 01 (UI only).
// PBI 02 will replace this with real scenarios loaded from Firestore.
export const sampleScenario: Scenario = {
  id: 'sc-001',
  title: 'Asking your manager for more time',
  category: 'professional',
  tone: 'Polite and professional',
  context:
    "You're two days from a project deadline and a teammate is out sick. " +
    'Your manager just messaged to check on progress.',
  contact: { name: 'Jordan', role: 'Manager' },
  messages: [
    {
      id: 'm1',
      sender: 'them',
      text: 'Hey! Just checking in. Are we still on track for Friday?',
      time: '10:42 AM',
    },
    { id: 'm2', sender: 'me', text: 'Hi Jordan, thanks for checking in.', time: '10:44 AM' },
    {
      id: 'm3',
      sender: 'them',
      text: 'Great. Let me know if anything comes up.',
      time: '10:45 AM',
    },
  ],
  options: [
    { id: 'a', text: "Honestly no, Sam is out and there's no way we finish by Friday." },
    {
      id: 'b',
      text:
        'Actually, one thing came up. Sam is out sick, so we may need until Tuesday. ' +
        'I can send a plan for what will be ready by Friday.',
    },
    { id: 'c', text: 'Yep, all good! 👍' },
    { id: 'd', text: 'Can we talk later? Kind of busy right now.' },
  ],
  correctOptionId: 'b',
}
