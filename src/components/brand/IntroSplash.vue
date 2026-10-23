<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

// Loading screen for Textraordinary, built around the chat-bubble "T" logo.
//   1. The bubble pops in with the T inside.
//   2. The T tucks away and the bubble stretches into a long message while
//      "textraordinary" types itself out inside it.
//   3. The message "sends": the word slides out into place next to the bubble,
//      the bubble snaps back to its round shape and the T pops back in.
// Click or press any key to skip. Emits 'done' when finished.
// While `ready` is false (e.g. the app is still checking the saved login), the
// screen holds on the finished logo instead of fading out.
const props = withDefaults(defineProps<{ ready?: boolean }>(), { ready: true })
const emit = defineEmits<{ done: [] }>()

const root = ref<HTMLElement | null>(null)
const leaving = ref(false)
const isStatic = ref(false)

const T = {"pop": 150, "tIn": 420, "tOut": 1050, "stretch": 1050, "typing": 1880, "send": 4405, "out": 4555, "tBack": 5075}
const TIMES: number[] = [1880, 1997, 2122, 2252, 2393, 2518, 2827, 2900, 3004, 3145, 3264, 3401, 3480, 3585]
const CURSOR: Keyframe[] = [{"transform": "translateX(120px)", "opacity": 1, "offset": 0.0, "easing": "step-end"}, {"transform": "translateX(120px)", "opacity": 0, "offset": 0.09029, "easing": "step-end"}, {"transform": "translateX(149.9px)", "opacity": 1, "offset": 0.13969, "easing": "step-end"}, {"transform": "translateX(187.4px)", "opacity": 1, "offset": 0.17956, "easing": "step-end"}, {"transform": "translateX(226.2px)", "opacity": 1, "offset": 0.22215, "easing": "step-end"}, {"transform": "translateX(250.3px)", "opacity": 1, "offset": 0.26644, "easing": "step-end"}, {"transform": "translateX(279.8px)", "opacity": 1, "offset": 0.31448, "easing": "step-end"}, {"transform": "translateX(317.8px)", "opacity": 1, "offset": 0.35707, "easing": "step-end"}, {"transform": "translateX(356.0px)", "opacity": 1, "offset": 0.46235, "easing": "step-end"}, {"transform": "translateX(385.5px)", "opacity": 1, "offset": 0.48722, "easing": "step-end"}, {"transform": "translateX(425.4px)", "opacity": 1, "offset": 0.52266, "easing": "step-end"}, {"transform": "translateX(443.4px)", "opacity": 1, "offset": 0.5707, "easing": "step-end"}, {"transform": "translateX(482.5px)", "opacity": 1, "offset": 0.61124, "easing": "step-end"}, {"transform": "translateX(520.5px)", "opacity": 1, "offset": 0.65792, "easing": "step-end"}, {"transform": "translateX(550.0px)", "opacity": 1, "offset": 0.68484, "easing": "step-end"}, {"transform": "translateX(589.3px)", "opacity": 1, "offset": 0.72061, "easing": "step-end"}, {"transform": "translateX(589.3px)", "opacity": 0, "offset": 0.90119, "easing": "step-end"}, {"transform": "translateX(589.3px)", "opacity": 1, "offset": 0.99148, "easing": "step-end"}, {"transform": "translateX(589.3px)", "opacity": 0, "offset": 1}]
const CURSOR_START = 1470
const CURSOR_SPAN = 2935
const END = 6175
const FADE_MS = 450
const STRETCH = 256.4
const CAM_START = 244.8
const CAM_MSG = 116.6
const MSG_WORD = 'translate(-42.64px, 13.14px) scale(0.62)'

let timers: ReturnType<typeof setTimeout>[] = []
const anims: Animation[] = []

function finish() {
  if (leaving.value) return
  leaving.value = true
  timers.forEach(clearTimeout)
  timers = [setTimeout(() => emit('done'), FADE_MS)]
}

// the animation is over; leave as soon as the app is ready
let animationOver = false
function autoEnd() {
  animationOver = true
  if (props.ready) finish()
}
watch(
  () => props.ready,
  (isReady) => {
    if (isReady && animationOver) finish()
  },
)

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Tab') finish()
}

function run(el: Element | null | undefined, frames: Keyframe[], opts: KeyframeAnimationOptions) {
  if (el) anims.push(el.animate(frames, { fill: 'both', ...opts }))
}

function animate() {
  const r = root.value
  if (!r) return
  const q = (s: string) => r.querySelector(s)
  const qa = (s: string) => Array.from(r.querySelectorAll(s))
  const SPRING = 'cubic-bezier(.3,1.35,.5,1)'
  const SMOOTH = 'cubic-bezier(.55,0,.2,1)'

  // 1. bubble pops in, then the T
  run(q('.bubbleAll'), [
    { transform: 'scale(0)' },
    { transform: 'scale(1.14)', offset: 0.55 },
    { transform: 'scale(0.95)', offset: 0.8 },
    { transform: 'scale(1)' },
  ], { duration: 520, delay: T.pop, easing: 'ease-out' })
  const bigT = q('.bigT')
  run(bigT, [
    { transform: 'scale(0) rotate(-12deg)' },
    { transform: 'scale(1.2) rotate(4deg)', offset: 0.6 },
    { transform: 'scale(1) rotate(0deg)' },
  ], { duration: 380, delay: T.tIn, easing: 'ease-out' })

  // 2. T tucks away; bubble stretches into a long message (camera keeps it centred)
  run(bigT, [
    { transform: 'scale(1)' },
    { transform: 'scale(1.12, 0.85)', offset: 0.3 },
    { transform: 'scale(0) rotate(10deg)' },
  ], { duration: 260, delay: T.tOut, easing: 'ease-in', fill: 'forwards' })

  const right = q('.rightHalf')
  const bars = qa('.bar')
  const cam = q('.cam')
  const stretchFrames = (from: string, to: string): Keyframe[] => [
    { transform: from },
    { transform: to },
  ]
  run(right, stretchFrames('translateX(0px)', `translateX(${STRETCH}px)`), { duration: 620, delay: T.stretch, easing: SPRING })
  bars.forEach((b) =>
    run(b, stretchFrames('scaleX(0)', `scaleX(${STRETCH + 0.6})`), { duration: 620, delay: T.stretch, easing: SPRING }),
  )
  run(cam, stretchFrames(`translateX(${CAM_START}px)`, `translateX(${CAM_MSG}px)`), { duration: 620, delay: T.stretch, easing: SPRING })

  // the message types itself out inside the bubble
  // each letter simply appears when it's typed, like a real text field
  qa('.letter').forEach((L, i) =>
    run(L, [{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: TIMES[i] ?? 0 }),
  )
  // the cursor follows the letters (keyframes generated from the letter positions)
  run(q('.msgCursor'), CURSOR, { duration: CURSOR_SPAN, delay: CURSOR_START, fill: 'forwards' })

  // 3. send: a quick squash, then the word slides out and the bubble snaps back
  run(q('.bubbleAll'), [
    { transform: 'scale(1)' },
    { transform: 'scale(1.03, 0.9)', offset: 0.4 },
    { transform: 'scale(1)' },
  ], { duration: 220, delay: T.send, fill: 'none' })
  run(q('.word'), stretchFrames(MSG_WORD, 'translate(0px, 0px) scale(1)'), { duration: 640, delay: T.out, easing: SMOOTH })
  run(right, stretchFrames(`translateX(${STRETCH}px)`, 'translateX(0px)'),
    { duration: 600, delay: T.out, easing: SMOOTH, fill: 'forwards' })
  bars.forEach((b) =>
    run(b, stretchFrames(`scaleX(${STRETCH + 0.6})`, 'scaleX(0)'),
      { duration: 600, delay: T.out, easing: SMOOTH, fill: 'forwards' }),
  )
  run(cam, stretchFrames(`translateX(${CAM_MSG}px)`, 'translateX(0px)'),
    { duration: 640, delay: T.out, easing: SMOOTH, fill: 'forwards' })

  // bubble lands back to its round shape with a squash, and the T pops back in
  run(q('.bubbleAll'), [
    { transform: 'scale(1)' },
    { transform: 'scale(1.08, 0.92)', offset: 0.35 },
    { transform: 'scale(0.97, 1.03)', offset: 0.7 },
    { transform: 'scale(1)' },
  ], { duration: 380, delay: T.out + 560, fill: 'none' })
  run(bigT, [
    { transform: 'scale(0) rotate(-12deg)' },
    { transform: 'scale(1.25) rotate(4deg)', offset: 0.6 },
    { transform: 'scale(1) rotate(0deg)' },
  ], { duration: 420, delay: T.tBack, easing: 'ease-out', fill: 'forwards' })
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced || typeof Element.prototype.animate !== 'function') {
    isStatic.value = true
    timers.push(setTimeout(autoEnd, 900))
    return
  }
  animate()
  timers.push(setTimeout(autoEnd, END))
})

onBeforeUnmount(() => {
  timers.forEach(clearTimeout)
  anims.forEach((a) => a.cancel())
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div
    ref="root"
    class="intro"
    :class="{ leaving, static: isStatic }"
    role="img"
    aria-label="Textraordinary"
    @click="finish"
  >
    <svg class="stage" viewBox="-800 -450 1600 900" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <clipPath id="bubbleLeft"><rect x="-20" y="-10" width="70.4" height="120" /></clipPath>
        <clipPath id="bubbleRight"><rect x="49.6" y="-10" width="70" height="120" /></clipPath>
      </defs>
      <g transform="translate(-471.6 -80.0) scale(1.6)">
        <g class="cam">
          <g class="bubbleAll">
            <path d="M50 4 C76 4 96 22 96 46 C96 70 76 88 50 88 C44 88 38 87 33 85 L12 96 L17 77 C9 69 4 58 4 46 C4 22 24 4 50 4 Z M50 18 C69 18 82 30 82 46 C82 62 69 74 50 74 C31 74 18 62 18 46 C18 30 31 18 50 18 Z" fill="#d6e668" fill-rule="evenodd" clip-path="url(#bubbleLeft)" />
            <rect class="bar" x="50" y="4" width="1" height="14" fill="#d6e668" />
            <rect class="bar" x="50" y="74" width="1" height="14" fill="#d6e668" />
            <g class="rightHalf">
              <path d="M50 4 C76 4 96 22 96 46 C96 70 76 88 50 88 C44 88 38 87 33 85 L12 96 L17 77 C9 69 4 58 4 46 C4 22 24 4 50 4 Z M50 18 C69 18 82 30 82 46 C82 62 69 74 50 74 C31 74 18 62 18 46 C18 30 31 18 50 18 Z" fill="#d6e668" fill-rule="evenodd" clip-path="url(#bubbleRight)" />
            </g>
            <path class="bigT" d="M31 30 H69 V41 H55.5 V64 H44.5 V41 H31 Z" fill="#d6e668" />
          </g>
          <g class="word" fill="#d6e668">
            <path class="letter" d="M136.6875 70.0Q132.21875 70.0 130.0 67.96875Q127.78125 65.9375 127.78125 61.9375V44.0625H123.21875V36.25H127.78125V29.8125L138.75 27.09375V36.25H144.78125V44.0625H138.75V60.4375Q138.75 61.5 139.046875 61.84375Q139.34375 62.1875 140.3125 62.1875H145.46875V70.0Z" />
            <path class="letter" d="M166.2825 70.84375Q161.2825 70.84375 157.141875 68.671875Q153.00125 66.5 150.5325 62.515625Q148.06375 58.53125 148.06375 53.0625Q148.06375 47.65625 150.47 43.703125Q152.87625 39.75 157.00125 37.578125Q161.12625 35.40625 166.2825 35.40625Q169.12625 35.40625 172.048125 36.25Q174.97 37.09375 177.43875 39.25Q179.9075 41.40625 181.4075 45.296875Q182.9075 49.1875 182.9075 55.25H159.50125Q159.81375 58.28125 161.0325 60.28125Q162.62625 62.96875 166.18875 62.96875Q168.37625 62.96875 170.00125 61.828125Q171.62625 60.6875 172.56375 58.21875L182.31375 60.53125Q181.12625 64.21875 178.579375 66.5Q176.0325 68.78125 172.7825 69.8125Q169.5325 70.84375 166.2825 70.84375ZM159.68875 49.5H172.12625Q171.81375 47.59375 171.18875 46.28125Q170.2825 44.46875 168.954375 43.640625Q167.62625 42.8125 165.97 42.8125Q163.68875 42.8125 162.235625 44.15625Q160.7825 45.5 160.095 47.8125Q159.845 48.625 159.68875 49.5Z" />
            <path class="letter" d="M184.2525 70.0 197.03375 52.53125 185.09625 36.25H197.28375L204.15875 46.78125L210.44 36.25H222.72125L210.44 53.46875L222.8775 70.0H210.53375L203.40875 58.96875L196.5025 70.0Z" />
            <path class="letter" d="M237.06625 70.0Q232.5975 70.0 230.37875 67.96875Q228.16 65.9375 228.16 61.9375V44.0625H223.5975V36.25H228.16V29.8125L239.12875 27.09375V36.25H245.16V44.0625H239.12875V60.4375Q239.12875 61.5 239.425625 61.84375Q239.7225 62.1875 240.69125 62.1875H245.8475V70.0Z" />
            <path class="letter" d="M250.59875 70.0V36.25H261.255V41.96875Q262.8175 38.84375 265.3175 37.25Q268.16125 35.40625 271.72375 35.40625Q272.72375 35.40625 273.78625 35.5625Q274.84875 35.71875 275.91125 36.09375L275.1925 45.25Q273.03625 44.65625 271.09875 44.65625Q269.34875 44.65625 267.66125 45.234375Q265.97375 45.8125 264.59875 47.171875Q263.22375 48.53125 262.395625 50.90625Q261.5675 53.28125 261.5675 56.875V70.0Z" />
            <path class="letter" d="M290.0375 70.8125Q286.88125 70.8125 284.053125 69.75Q281.225 68.6875 279.475 66.4375Q277.725 64.1875 277.725 60.59375Q277.725 56.71875 279.959375 54.203125Q282.19375 51.6875 286.271875 50.4375Q290.35 49.1875 295.975 49.1875H299.7875V48.1875Q299.7875 45.125 298.740625 43.71875Q297.69375 42.3125 295.2875 42.3125Q292.94375 42.3125 291.725 43.5625Q290.50625 44.8125 290.13125 47.21875L279.19375 45.4375Q279.81875 42.59375 281.740625 40.3125Q283.6625 38.03125 287.146875 36.6875Q290.63125 35.34375 295.88125 35.34375Q300.50625 35.34375 303.803125 36.71875Q307.1 38.09375 308.865625 41.40625Q310.63125 44.71875 310.63125 50.5625V60.4375Q310.63125 61.5 310.928125 61.84375Q311.225 62.1875 312.19375 62.1875H313.56875V70.0H308.69375Q304.44375 70.0 302.35 67.9375Q301.25625 66.875 300.725 65.28125Q300.06875 66.46875 299.06875 67.53125Q297.725 68.96875 295.521875 69.890625Q293.31875 70.8125 290.0375 70.8125ZM293.31875 63.6875Q295.35 63.6875 296.81875 62.78125Q298.2875 61.875 299.1 60.15625Q299.9125 58.4375 299.9125 56.0V55.09375H296.50625Q293.50625 55.09375 291.85 55.875Q290.19375 56.65625 289.553125 57.78125Q288.9125 58.90625 288.9125 59.9375Q288.9125 60.625 289.25625 61.5Q289.6 62.375 290.5375 63.03125Q291.475 63.6875 293.31875 63.6875Z" />
            <path class="letter" d="M333.72625000000005 70.84375Q328.47625000000005 70.84375 324.47625000000005 68.59375Q320.47625000000005 66.34375 318.24187500000005 62.34375Q316.00750000000005 58.34375 316.00750000000005 53.125Q316.00750000000005 47.875 318.24187500000005 43.890625Q320.47625000000005 39.90625 324.47625000000005 37.65625Q328.47625000000005 35.40625 333.72625000000005 35.40625Q338.97625000000005 35.40625 342.97625000000005 37.65625Q346.97625000000005 39.90625 349.22625000000005 43.890625Q351.47625000000005 47.875 351.47625000000005 53.125Q351.47625000000005 58.375 349.22625000000005 62.359375Q346.97625000000005 66.34375 342.96062500000005 68.59375Q338.94500000000005 70.84375 333.72625000000005 70.84375ZM333.75750000000005 63.0Q336.69500000000005 63.0 338.41375000000005 60.34375Q340.13250000000005 57.6875 340.13250000000005 53.125Q340.13250000000005 48.5625 338.41375000000005 45.90625Q336.69500000000005 43.25 333.72625000000005 43.25Q330.78875000000005 43.25 329.07000000000005 45.90625Q327.35125000000005 48.5625 327.35125000000005 53.125Q327.35125000000005 57.6875 329.07000000000005 60.34375Q330.78875000000005 63.0 333.75750000000005 63.0Z" />
            <path class="letter" d="M356.3212500000001 70.0V36.25H366.9775000000001V41.96875Q368.5400000000001 38.84375 371.0400000000001 37.25Q373.8837500000001 35.40625 377.4462500000001 35.40625Q378.4462500000001 35.40625 379.5087500000001 35.5625Q380.5712500000001 35.71875 381.6337500000001 36.09375L380.9150000000001 45.25Q378.7587500000001 44.65625 376.8212500000001 44.65625Q375.0712500000001 44.65625 373.3837500000001 45.234375Q371.6962500000001 45.8125 370.3212500000001 47.171875Q368.9462500000001 48.53125 368.1181250000001 50.90625Q367.2900000000001 53.28125 367.2900000000001 56.875V70.0Z" />
            <path class="letter" d="M397.2912500000001 70.84375Q393.0100000000001 70.84375 389.8850000000001 68.734375Q386.7600000000001 66.625 385.1037500000001 62.65625Q383.4475000000001 58.6875 383.4475000000001 53.03125Q383.4475000000001 47.40625 385.1193750000001 43.46875Q386.7912500000001 39.53125 389.9318750000001 37.46875Q393.0725000000001 35.40625 397.4787500000001 35.40625Q401.3850000000001 35.40625 404.1975000000001 37.15625Q406.2287500000001 38.4375 407.7600000000001 40.84375V23.125H418.7287500000001V70.0H408.3225000000001V63.96875Q406.5412500000001 67.46875 403.7912500000001 69.125Q400.9787500000001 70.84375 397.2912500000001 70.84375ZM401.4787500000001 62.71875Q403.4787500000001 62.71875 405.0256250000001 61.65625Q406.5725000000001 60.59375 407.4631250000001 58.453125Q408.3537500000001 56.3125 408.3537500000001 53.15625Q408.3537500000001 48.40625 406.4162500000001 45.953125Q404.4787500000001 43.5 401.5725000000001 43.5Q398.5100000000001 43.5 396.7287500000001 46.109375Q394.9475000000001 48.71875 394.9475000000001 53.28125Q394.9475000000001 57.6875 396.6818750000001 60.203125Q398.4162500000001 62.71875 401.4787500000001 62.71875Z" />
            <path class="letter" d="M425.73000000000013 70.0V36.25H436.69875000000013V70.0ZM431.23000000000013 32.875Q428.04250000000013 32.875 426.19875000000013 31.03125Q424.35500000000013 29.1875 424.35500000000013 26.0Q424.35500000000013 22.8125 426.19875000000013 20.96875Q428.04250000000013 19.125 431.23000000000013 19.125Q434.41750000000013 19.125 436.26125000000013 20.96875Q438.10500000000013 22.8125 438.10500000000013 26.0Q438.10500000000013 29.1875 436.26125000000013 31.03125Q434.41750000000013 32.875 431.23000000000013 32.875Z" />
            <path class="letter" d="M443.70000000000016 70.0V36.25H454.35625000000016V42.1875Q455.95000000000016 39.03125 458.51250000000016 37.28125Q461.26250000000016 35.40625 465.20000000000016 35.40625Q469.26250000000016 35.40625 471.74687500000016 37.265625Q474.23125000000016 39.125 475.35625000000016 42.359375Q476.48125000000016 45.59375 476.48125000000016 49.71875V70.0H465.54375000000016V50.375Q465.54375000000016 47.0 464.55937500000016 45.25Q463.57500000000016 43.5 461.04375000000016 43.5Q457.88750000000016 43.5 456.27812500000016 46.390625Q454.66875000000016 49.28125 454.66875000000016 55.40625V70.0Z" />
            <path class="letter" d="M492.7950000000002 70.8125Q489.6387500000002 70.8125 486.8106250000002 69.75Q483.9825000000002 68.6875 482.2325000000002 66.4375Q480.4825000000002 64.1875 480.4825000000002 60.59375Q480.4825000000002 56.71875 482.7168750000002 54.203125Q484.9512500000002 51.6875 489.0293750000002 50.4375Q493.1075000000002 49.1875 498.7325000000002 49.1875H502.5450000000002V48.1875Q502.5450000000002 45.125 501.4981250000002 43.71875Q500.4512500000002 42.3125 498.0450000000002 42.3125Q495.7012500000002 42.3125 494.4825000000002 43.5625Q493.2637500000002 44.8125 492.8887500000002 47.21875L481.9512500000002 45.4375Q482.5762500000002 42.59375 484.4981250000002 40.3125Q486.4200000000002 38.03125 489.9043750000002 36.6875Q493.3887500000002 35.34375 498.6387500000002 35.34375Q503.2637500000002 35.34375 506.5606250000002 36.71875Q509.8575000000002 38.09375 511.6231250000002 41.40625Q513.3887500000002 44.71875 513.3887500000002 50.5625V60.4375Q513.3887500000002 61.5 513.6856250000002 61.84375Q513.9825000000002 62.1875 514.9512500000002 62.1875H516.3262500000002V70.0H511.4512500000002Q507.2012500000002 70.0 505.1075000000002 67.9375Q504.0137500000002 66.875 503.4825000000002 65.28125Q502.8262500000002 66.46875 501.8262500000002 67.53125Q500.4825000000002 68.96875 498.2793750000002 69.890625Q496.0762500000002 70.8125 492.7950000000002 70.8125ZM496.0762500000002 63.6875Q498.1075000000002 63.6875 499.5762500000002 62.78125Q501.0450000000002 61.875 501.8575000000002 60.15625Q502.6700000000002 58.4375 502.6700000000002 56.0V55.09375H499.2637500000002Q496.2637500000002 55.09375 494.6075000000002 55.875Q492.9512500000002 56.65625 492.3106250000002 57.78125Q491.6700000000002 58.90625 491.6700000000002 59.9375Q491.6700000000002 60.625 492.0137500000002 61.5Q492.3575000000002 62.375 493.2950000000002 63.03125Q494.2325000000002 63.6875 496.0762500000002 63.6875Z" />
            <path class="letter" d="M520.8900000000002 70.0V36.25H531.5462500000002V41.96875Q533.1087500000002 38.84375 535.6087500000002 37.25Q538.4525000000002 35.40625 542.0150000000002 35.40625Q543.0150000000002 35.40625 544.0775000000002 35.5625Q545.1400000000002 35.71875 546.2025000000002 36.09375L545.4837500000002 45.25Q543.3275000000002 44.65625 541.3900000000002 44.65625Q539.6400000000002 44.65625 537.9525000000002 45.234375Q536.2650000000002 45.8125 534.8900000000002 47.171875Q533.5150000000002 48.53125 532.6868750000002 50.90625Q531.8587500000002 53.28125 531.8587500000002 56.875V70.0Z" />
            <path class="letter" d="M553.4850000000002 82.1875V74.375H559.4225000000002Q560.1100000000002 74.375 560.4537500000002 74.125Q560.7975000000002 73.875 561.0787500000002 73.15625L561.5162500000002 72.0L546.8287500000002 36.25H559.0787500000002L566.5475000000002 60.5625L574.0162500000002 36.25H586.2662500000002L570.7350000000002 75.90625Q569.2975000000002 79.59375 566.8443750000002 80.890625Q564.3912500000002 82.1875 560.9537500000002 82.1875Z" />
            <rect class="msgCursor" x="0" y="20" width="4.5" height="62" rx="2" />
          </g>
        </g>
      </g>
    </svg>
    <p class="skip">Click to skip</p>
  </div>
</template>

<style scoped>
.intro {
  position: fixed;
  inset: 0;
  z-index: 1000;
  overflow: hidden;
  cursor: pointer;
  background: #2b3541;
  transition: opacity 0.45s ease;
}
.intro.leaving {
  opacity: 0;
  pointer-events: none;
}
.stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.skip {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  opacity: 0;
  animation: fade-in 0.4s ease 1.2s forwards;
}
@keyframes fade-in { to { opacity: 1; } }

.bubbleAll, .bigT, .letter, .bar {
  transform-box: fill-box;
  transform-origin: 50% 50%;
}
.letter { transform-origin: 50% 100%; }
.bar { transform-origin: 0% 50%; }
/* .word, .cam and .rightHalf transform around their own user-space origin */

/* starting states (the animations take over from here) */
.cam { transform: translateX(244.8px); }
.bubbleAll, .bigT { transform: scale(0); }
.bar { transform: scaleX(0); }
.word { transform: translate(-42.64px, 13.14px) scale(0.62); }
.letter, .msgCursor { opacity: 0; }

/* reduced motion / no animation support: show the finished logo */
.static .cam, .static .word, .static .bubbleAll, .static .bigT { transform: none; }
.static .letter { opacity: 1; }
</style>
