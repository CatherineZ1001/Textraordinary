// Sounds for the conversation page.
// - src/assets/sounds/notification.mp3: the lock screen notification
// - src/assets/sounds/message.mp3: incoming and sent messages in the chat
// If a file can't load, it falls back to sounds generated in code below
// (a two-note chime for incoming, a whoosh for sent).
//
// Browsers only allow sound after the user clicks/taps something,
// so call unlockAudio() from inside a click handler first.

import messageSoundUrl from '@/assets/sounds/message.mp3'
import notificationSoundUrl from '@/assets/sounds/notification.mp3'

type ClipName = 'message' | 'notification'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let unlocked = false
let muted = false

// Start downloading the files right away (allowed before any click);
// they get decoded once the audio context exists.
const downloads: Record<ClipName, Promise<ArrayBuffer>> = {
  message: fetch(messageSoundUrl).then((r) => r.arrayBuffer()),
  notification: fetch(notificationSoundUrl).then((r) => r.arrayBuffer()),
}
const clips: Partial<Record<ClipName, Promise<AudioBuffer | null>>> = {}

export function unlockAudio(): void {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  if (!ctx) {
    const audio = new AC()
    ctx = audio
    master = audio.createGain()
    master.gain.value = 0.6
    master.connect(audio.destination)
    for (const name of Object.keys(downloads) as ClipName[]) {
      clips[name] = downloads[name]
        .then((data) => audio.decodeAudioData(data))
        .catch((err: unknown) => {
          console.warn(`Could not load ${name} sound.`, err)
          return null
        })
    }
  }
  void ctx.resume()
  unlocked = true
}

export const isAudioUnlocked = (): boolean => unlocked
export const setMuted = (value: boolean): void => {
  muted = value
}

function ready(): boolean {
  return ctx !== null && master !== null && unlocked && !muted
}

// Plays a decoded clip. Resolves to false if it couldn't, so callers can fall back.
async function playClip(name: ClipName): Promise<boolean> {
  const buffer = await clips[name]
  if (!buffer || !ready() || !ctx || !master) return false
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.value = 1.4 // master is 0.6, so this plays the file at about normal volume
  source.connect(gain).connect(master)
  source.start()
  return true
}

/** Lock screen notification. Falls back to the chime if the file is missing. */
export async function playNotification(): Promise<void> {
  if (!ready()) return
  if (!(await playClip('notification'))) chime()
}

/** Incoming message. */
export async function playReceive(): Promise<void> {
  if (!ready()) return
  if (!(await playClip('message'))) chime()
}

/** Sent message. */
export async function playSend(): Promise<void> {
  if (!ready()) return
  if (!(await playClip('message'))) whoosh()
}

// --- Fallback sounds generated in code -------------------------------------

// A short bell-like note: sine wave plus quiet overtones, fast decay.
function bell(audio: AudioContext, out: AudioNode, freq: number, start: number, length: number, volume: number) {
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  gain.connect(out)

  for (const [mult, level] of [
    [1, 1],
    [2.01, 0.18],
    [3.02, 0.06],
  ] as const) {
    const osc = audio.createOscillator()
    const g = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq * mult
    g.gain.value = level
    osc.connect(g).connect(gain)
    osc.start(start)
    osc.stop(start + length + 0.05)
  }
}

// Quick rising two-note chime.
function chime() {
  if (!ctx || !master) return
  const t = ctx.currentTime + 0.01
  bell(ctx, master, 1174.7, t, 0.35, 0.22) // D6
  bell(ctx, master, 1568.0, t + 0.1, 0.55, 0.2) // G6
}

// Short airy whoosh (filtered noise sweeping upward).
function whoosh() {
  if (!ctx || !master) return
  const t = ctx.currentTime + 0.01
  const length = 0.32

  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.4
  filter.frequency.setValueAtTime(350, t)
  filter.frequency.exponentialRampToValueAtTime(3200, t + length * 0.8)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.06)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)

  noise.connect(filter).connect(gain).connect(master)
  noise.start(t)
  noise.stop(t + length)
}
