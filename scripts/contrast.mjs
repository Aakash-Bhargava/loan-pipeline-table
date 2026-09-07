#!/usr/bin/env node
/**
 * Reads src/styles/tokens.css, resolves the token graph, and measures every
 * contrast pair the design contract requires. Exits non-zero if any pair is
 * under its threshold.
 *
 *   node scripts/contrast.mjs             human readable table
 *   node scripts/contrast.mjs --markdown  markdown table for the README
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const TOKENS = path.join(here, '..', 'src', 'styles', 'tokens.css')

/** Every pair the contract requires, with its threshold and why. */
const REQUIRED = [
  { fg: '--ink-primary', bg: '--ground', min: 7, note: 'body text' },
  { fg: '--ink-secondary', bg: '--ground', min: 7, note: 'findings, values' },
  { fg: '--ink-muted', bg: '--ground', min: 4.5, note: 'labels, headers' },
  // Stage marks are ordinal marks with a written label beside them, so the
  // gate is the ordinal ramp's light-end floor, not a text ratio.
  { fg: '--stage-application-mark', bg: '--ground', min: 2, note: 'stage mark (labelled)' },
  { fg: '--stage-processing-mark', bg: '--ground', min: 2, note: 'stage mark (labelled)' },
  { fg: '--stage-underwriting-mark', bg: '--ground', min: 2, note: 'stage mark (labelled)' },
  { fg: '--stage-closing-mark', bg: '--ground', min: 2, note: 'stage mark (labelled)' },
  { fg: '--stage-funded-mark', bg: '--ground', min: 2, note: 'stage mark (labelled)' },
  { fg: '--stage-label-fg', bg: '--ground', min: 7, note: 'stage label' },
  { fg: '--danger-fg', bg: '--danger-bg', min: 4.5, note: 'danger surface' },
  { fg: '--ink-inverse', bg: '--accent-strong', min: 4.5, note: 'primary button, pressed' },
  { fg: '--focus', bg: '--ground', min: 3, note: 'focus ring on a resting row' },
  { fg: '--focus', bg: '--ground-selected', min: 3, note: 'focus ring on a selected row' },

  // Pairs the interface actually renders, not just the palette in the abstract.
  { fg: '--ink-primary', bg: '--ground-selected', min: 7, note: 'text in a selected row' },
  { fg: '--ink-secondary', bg: '--ground-selected', min: 7, note: 'finding in a selected row' },
  { fg: '--ink-primary', bg: '--ground-hover', min: 7, note: 'text in a hovered row' },
  { fg: '--ink-secondary', bg: '--ground-hover', min: 7, note: 'finding in a hovered row' },
  { fg: '--danger-fg', bg: '--ground', min: 4.5, note: 'error title, flag dot' },
  { fg: '--ink-inverse', bg: '--accent', min: 4.5, note: 'primary button label' },
  // WCAG 1.4.3 exempts disabled controls from 4.5:1; it must still be legible.
  { fg: '--ink-muted', bg: '--ground-inert', min: 3, note: 'disabled control (exempt)' },
]

function parseTokens(css) {
  const tokens = new Map()
  // Strip comments so a commented-out declaration never lands in the graph.
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].trim())
  }
  return tokens
}

/** Follow var() references down to a literal. */
function resolve(tokens, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`Token cycle at ${name}`)
  seen.add(name)

  const raw = tokens.get(name)
  if (raw === undefined) throw new Error(`Unknown token ${name}`)

  const reference = raw.match(/^var\(\s*(--[\w-]+)\s*\)$/)
  if (reference) return resolve(tokens, reference[1], seen)
  return raw
}

function toRgb(value) {
  const hex = value.trim()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex)
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (short) return [short[1], short[2], short[3]].map((c) => parseInt(c + c, 16))
  if (long) return [long[1], long[2], long[3]].map((c) => parseInt(c, 16))
  throw new Error(`Not a hex colour: ${value}`)
}

/** WCAG 2.1 relative luminance. */
function luminance([r, g, b]) {
  const [rl, gl, bl] = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

function ratio(fg, bg) {
  const a = luminance(toRgb(fg))
  const b = luminance(toRgb(bg))
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

const tokens = parseTokens(readFileSync(TOKENS, 'utf8'))

const rows = REQUIRED.map((pair) => {
  const fgValue = resolve(tokens, pair.fg)
  const bgValue = resolve(tokens, pair.bg)
  // Floor rather than round, so a value never advertises a ratio it misses.
  const measured = Math.floor(ratio(fgValue, bgValue) * 100) / 100
  return { ...pair, fgValue, bgValue, measured, pass: measured >= pair.min }
})

const failures = rows.filter((row) => !row.pass)
const markdown = process.argv.includes('--markdown')

if (markdown) {
  console.log('| Foreground | Background | Ratio | Min | Use |')
  console.log('| --- | --- | --- | --- | --- |')
  for (const row of rows) {
    console.log(
      `| \`${row.fg}\` ${row.fgValue} | \`${row.bg}\` ${row.bgValue} | ${row.measured.toFixed(2)}:1 | ${row.min}:1 | ${row.note} |`,
    )
  }
} else {
  const width = Math.max(...rows.map((row) => row.fg.length + row.bg.length)) + 6
  for (const row of rows) {
    const label = `${row.fg} on ${row.bg}`.padEnd(width)
    const mark = row.pass ? 'pass' : 'FAIL'
    console.log(`${mark}  ${label} ${row.measured.toFixed(2)}:1  (min ${row.min}:1)  ${row.note}`)
  }
  console.log(`\n${rows.length - failures.length}/${rows.length} pairs pass.`)
}

if (failures.length > 0) {
  console.error(`\n${failures.length} contrast pair(s) under threshold.`)
  process.exit(1)
}
