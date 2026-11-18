// Workout sheet: a visual of every exercise the quest planner uses, built
// from the game data so it never drifts from it.
//
//   npm run workouts:sheet   writes docs/workouts.html (open it in a browser)
//
// Rebuild after editing rpg/data/workouts.json or rpg/classes.ts.
import fs from 'node:fs'
import path from 'node:path'
import { CLASSES, CLASS_ORDER, type ClassId } from '../rpg/classes'
import {
  EXERCISES,
  PATTERNS,
  PRIMARY_EXERCISES,
  type Exercise,
  type MovementPattern,
} from '../rpg/exercises'
import { WARMUP_EXERCISE } from '../rpg/expedition'
import {
  diagramFor,
  FAR_BONES,
  FLOOR,
  fullPose,
  NEAR_BONES,
  type Pose,
  type Prop,
} from '../src/diagrams/poses'
import type { StatKey } from '../rpg/types'

const OUT = path.join(__dirname, '..', 'docs', 'workouts.html')

// Iron Arena tokens (src/theme/tokens.ts)
const STAT_COLOR: Record<StatKey, string> = {
  STR: '#FF5A6E',
  END: '#FF6A1A',
  AGI: '#F2B233',
  VIT: '#3DDC84',
}
const STAT_NAME: Record<StatKey, string> = {
  STR: 'Strength',
  END: 'Endurance',
  AGI: 'Agility',
  VIT: 'Vitality',
}
const PATTERN_ORDER: MovementPattern[] = (PATTERNS = [
  'push',
  'squat',
  'lunge',
  'hinge',
  'core',
  'lateral',
  'cardio',
  'mobility',
])

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const dose = (e: Exercise) =>
  `${e.sets} × ${e.target}${e.mode === 'timed' ? 's' : ' reps'}`

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/** The easier swaps below an exercise, in order (push-ups → knee → wall). */
function easierChain(e: Exercise): Exercise[] {
  const out: Exercise[] = []
  let cur = e.easierId ? EXERCISES[e.easierId] : undefined
  while (cur && out.length < 5) {
    out.push(cur)
    cur = cur.easierId ? EXERCISES[cur.easierId] : undefined
  }
  return out
}

/** One pose of an exercise's diagram as a small static SVG. */
function poseSvg(raw: Pose, props: Prop[] = []) {
  const p = fullPose(raw)
  const line = (a: [number, number], b: [number, number], o = 1) =>
    `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" opacity="${o}"/>`
  const prop = props
    .map((q) =>
      q.kind === 'wall'
        ? `<rect x="${q.x}" y="0" width="4" height="${FLOOR}" fill="#3A3D45"/>`
        : `<path d="M${q.x} ${q.seat}h14M${q.x + 1} ${q.seat}V${FLOOR}M${q.x + 13} ${q.seat}V${FLOOR}M${q.facing === 'right' ? q.x : q.x + 14} ${q.seat}V${q.seat - 18}" stroke="#3A3D45" stroke-width="2.5" fill="none"/>`
    )
    .join('')
  return `<svg viewBox="0 0 120 80" class="pose"><line x1="4" y1="${FLOOR + 1.5}" x2="116" y2="${FLOOR + 1.5}" stroke="#3A3D45" stroke-width="1.5"/>${prop}<g stroke="#F4F1EA" stroke-width="3.2" stroke-linecap="round">${FAR_BONES.map(([a, b]) => line(p[a], p[b], 0.4)).join('')}${NEAR_BONES.map(([a, b]) => line(p[a], p[b])).join('')}</g><circle cx="${p.H[0]}" cy="${p.H[1]}" r="5" fill="#F2B233"/></svg>`
}

function diagramStrip(e: Exercise) {
  const d = diagramFor(e)
  if (!d) return '<div class="poses missing">No diagram yet</div>'
  return `<div class="poses">${d.poses
    .map((p) => poseSvg(p, d.props))
    .join('<span class="arrow">→</span>')}</div>`
}

function card(e: Exercise, warmFor: ClassId[]) {
  const easier = easierChain(e)
  const classes = e.classAffinity.length
    ? e.classAffinity
        .map((c) => `<span class="chip cls">${esc(CLASSES[c].name)}</span>`)
        .join('')
    : '<span class="chip world">WORLD for every class</span>'
  return `
  <article class="card" style="--stat:${STAT_COLOR[e.stat]}">
    <header>
      <h3>${esc(e.name)}</h3>
      <span class="stat">+${e.reward} ${e.stat}</span>
    </header>
    ${diagramStrip(e)}
    <div class="dose">${dose(e)}</div>
    <div class="meta">
      <span class="chip">${cap(e.pattern)}</span>
      <span class="chip impact-${e.impact}">${cap(e.impact)} impact</span>
      <span class="chip">${e.mode === 'timed' ? 'Timed' : 'Reps'}</span>
      ${warmFor.map((c) => `<span class="chip warm">${esc(CLASSES[c].name)} warm-up</span>`).join('')}
    </div>
    <ul class="cues">${e.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    ${
      easier.length
        ? `<div class="easier"><span>Easier swap${easier.length > 1 ? 's' : ''}:</span> ${easier
            .map(
              (x) =>
                `<b>${esc(x.name)}</b> <small>${dose(x)} · ${esc(x.cues[0] ?? '')}</small>`
            )
            .join(' → ')}</div>`
        : ''
    }
    <div class="classes">${classes}</div>
  </article>`
}

function build() {
  const primaries = [...PRIMARY_EXERCISES].sort(
    (a, b) =>
      PATTERN_ORDER.indexOf(a.pattern) - PATTERN_ORDER.indexOf(b.pattern) ||
      a.name.localeCompare(b.name)
  )
  const warmFor = (id: string) =>
    CLASS_ORDER.filter((c) => WARMUP_EXERCISE[c] === id)
  const variants = Object.values(EXERCISES).filter((e) => e.variantOf)

  // Class x exercise grid
  const grid = `
  <table class="grid">
    <thead><tr><th>Exercise</th><th>Stat</th>${CLASS_ORDER.map(
      (c) => `<th>${esc(CLASSES[c].short)}</th>`
    ).join('')}</tr></thead>
    <tbody>${primaries
      .map(
        (e) =>
          `<tr><td>${esc(e.name)}</td><td><span class="dot" style="background:${STAT_COLOR[e.stat]}"></span>${e.stat}</td>${CLASS_ORDER.map(
            (c) =>
              `<td class="${e.classAffinity.includes(c) ? 'on' : ''}">${
                WARMUP_EXERCISE[c] === e.id
                  ? '★'
                  : e.classAffinity.includes(c)
                    ? '●'
                    : '<span class="w">w</span>'
              }</td>`
          ).join('')}</tr>`
      )
      .join('')}</tbody>
  </table>
  <p class="legend">● class quest &nbsp; ★ class quest and warm-up &nbsp; <span class="w">w</span> world quest (any class can get it)</p>`

  // Per class
  const classes = CLASS_ORDER.map((id) => {
    const c = CLASSES[id]
    const own = primaries.filter((e) => e.classAffinity.includes(id))
    const warm = EXERCISES[WARMUP_EXERCISE[id]]
    const stats = (Object.keys(c.baseStats) as StatKey[])
      .map(
        (s) =>
          `<span class="bs" style="--stat:${STAT_COLOR[s]}">${s} ${c.baseStats[s]}</span>`
      )
      .join('')
    return `
    <section class="class" id="${id}">
      <div class="class-head">
        <h2>${esc(c.name)}</h2>
        <p>${esc(c.desc)}</p>
        <div class="bss">${stats}</div>
        <p class="small"><b>Abilities:</b> ${c.abilities.map(esc).join(' · ')} &nbsp; <b>Warm-up:</b> ${esc(warm?.name ?? '—')} (1 set) &nbsp; <b>Patterns:</b> ${[
          ...new Set(own.map((e) => cap(e.pattern))),
        ].join(', ')}</p>
      </div>
      <div class="list">${own
        .map(
          (e) =>
            `<div class="row" style="--stat:${STAT_COLOR[e.stat]}"><b>${esc(e.name)}</b><span>${dose(e)}</span><span class="stat">+${e.reward} ${e.stat}</span></div>`
        )
        .join('')}</div>
    </section>`
  }).join('')

  const total = Object.keys(EXERCISES).length
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rep Raiders Workouts</title>
<style>
  :root {
    --floor: #111114; --deep: #0B0B0D; --iron: #1E1F24; --track: #2A2C33;
    --steel: #3A3D45; --steel-l: #8A8F99; --mist: #C9CBD1; --chalk: #F4F1EA;
    --crimson: #C8102E; --gold: #F2B233;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--deep); color: var(--chalk);
    font: 15px/1.5 Inter, system-ui, -apple-system, Segoe UI, sans-serif; }
  main { max-width: 1180px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 40px; line-height: 1; margin: 0 0 6px; letter-spacing: .01em;
    transform: skewX(-6deg); text-transform: uppercase; }
  h1 + p { color: var(--mist); margin: 0 0 24px; max-width: 70ch; }
  h2 { font-size: 22px; margin: 0; text-transform: uppercase; letter-spacing: .02em; }
  .section-title { margin: 40px 0 12px; font-size: 13px; letter-spacing: .14em;
    color: var(--gold); text-transform: uppercase; font-weight: 800; }
  .summary { display: flex; flex-wrap: wrap; gap: 10px; }
  .summary div { background: var(--iron); border: 1px solid var(--steel);
    border-radius: 12px; padding: 10px 14px; }
  .summary b { font-size: 24px; display: block; }
  .summary span { color: var(--steel-l); font-size: 12px; text-transform: uppercase; letter-spacing: .1em; }
  .grid-wrap { overflow-x: auto; }
  .grid { border-collapse: collapse; width: 100%; min-width: 620px;
    background: var(--floor); border: 1px solid var(--steel); border-radius: 12px; overflow: hidden; }
  .grid th, .grid td { padding: 7px 10px; border-bottom: 1px solid var(--track); text-align: center; }
  .grid th { background: var(--iron); font-size: 11px; letter-spacing: .1em; color: var(--steel-l); }
  .grid td:first-child, .grid th:first-child { text-align: left; }
  .grid td.on { color: var(--gold); background: rgba(200,16,46,.18); font-weight: 800; }
  .grid .w { color: var(--steel); }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .legend { color: var(--steel-l); font-size: 13px; }
  .classes { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
  .class { background: var(--floor); border: 1px solid var(--steel); border-left: 4px solid var(--crimson);
    border-radius: 14px; padding: 14px; }
  .class-head p { margin: 4px 0; color: var(--mist); }
  .class-head .small { font-size: 13px; color: var(--steel-l); }
  .class-head .small b { color: var(--gold); }
  .bss { display: flex; gap: 6px; margin: 6px 0; }
  .bs { font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 6px;
    background: var(--iron); color: var(--stat); border: 1px solid var(--stat); }
  .list { display: grid; gap: 6px; margin-top: 10px; }
  .row { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center;
    background: var(--iron); border-left: 3px solid var(--stat); border-radius: 8px; padding: 6px 10px; }
  .row span { color: var(--mist); font-size: 13px; }
  .row .stat, .card .stat { color: var(--stat); font-weight: 800; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
  .card { background: var(--floor); border: 1px solid var(--steel); border-top: 4px solid var(--stat);
    border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
  .card header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .card h3 { margin: 0; font-size: 19px; }
  .dose { font-size: 28px; font-weight: 800; line-height: 1; }
  .meta, .classes-row, .card .classes { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 999px; background: var(--iron); border: 1px solid var(--steel); color: var(--mist); }
  .chip.cls { border-color: var(--crimson); color: var(--chalk); background: rgba(200,16,46,.25); }
  .chip.world { color: var(--steel-l); }
  .chip.warm { border-color: var(--gold); color: var(--gold); }
  .impact-low { color: #3DDC84; } .impact-medium { color: #F2B233; } .impact-high { color: #FF5A6E; }
  .poses { display: flex; align-items: center; gap: 2px; background: var(--iron);
    border-radius: 10px; padding: 6px; overflow-x: auto; }
  .poses .pose { width: 96px; height: 64px; flex: none; }
  .poses .arrow { color: var(--steel-l); font-size: 12px; }
  .poses.missing { color: var(--steel-l); font-size: 13px; }
  .cues { margin: 0; padding-left: 18px; color: var(--mist); font-size: 14px; }
  .easier { font-size: 13px; color: var(--mist); background: var(--iron); border-radius: 8px; padding: 8px 10px; }
  .easier span { color: var(--gold); font-weight: 700; }
  .easier small { color: var(--steel-l); }
  footer { margin-top: 40px; color: var(--steel-l); font-size: 12px; }
</style>
</head>
<body>
<main>
  <h1>Rep Raiders Workouts</h1>
  <p>Every movement the quest planner can give out. Each day mixes about 60% <b>class quests</b> (your class's workouts) and 40% <b>world quests</b> (everything else), never repeating a movement pattern twice in a row. Easier swaps keep the quest's reward.</p>

  <div class="summary">
    <div><b>${primaries.length}</b><span>Quest workouts</span></div>
    <div><b>${variants.length}</b><span>Easier swaps</span></div>
    <div><b>${total}</b><span>Movements in total</span></div>
    <div><b>${CLASS_ORDER.length}</b><span>Classes</span></div>
    ${(Object.keys(STAT_COLOR) as StatKey[])
      .map(
        (s) =>
          `<div style="border-color:${STAT_COLOR[s]}"><b style="color:${STAT_COLOR[s]}">${primaries.filter((e) => e.stat === s).length}</b><span>${STAT_NAME[s]} (${s})</span></div>`
      )
      .join('')}
  </div>

  <div class="section-title">Who gets what</div>
  <div class="grid-wrap">${grid}</div>

  <div class="section-title">By class</div>
  <div class="classes">${classes}</div>

  <div class="section-title">Every quest workout</div>
  <div class="cards">${primaries.map((e) => card(e, warmFor(e.id))).join('')}</div>

  <footer>Generated from rpg/data/workouts.json and rpg/classes.ts by <code>npm run workouts:sheet</code>. Rebuild after changing them.</footer>
</main>
</body>
</html>
`
  fs.writeFileSync(OUT, html)
  console.log(
    `Wrote ${path.relative(process.cwd(), OUT)} (${primaries.length} quest workouts, ${variants.length} easier swaps)`
  )
}

build()
