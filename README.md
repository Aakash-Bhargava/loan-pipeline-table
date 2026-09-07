# Loan pipeline table

A dense table for the officers and processors who watch a mortgage pipeline all day. It carries stage, officer, money and an AI review per file, and is driven from the keyboard. This repository is the component, its tokens, stories and tests.

## Decisions

**One ratio, 1.2, from a 13px body.** Sizes close together (11, 13, 16, 19, 23) let a label, a value and a title differ without shouting.

**An 11px floor.** Below it Geist Mono stops being readable at a scan.

**A 4px baseline.** Rows are 32px compact, 44px comfortable, header included, so density never shifts anything.

**Contrast, measured.** `pnpm contrast` resolves the token graph and exits non-zero under threshold.

| Pair | Ratio | Min |
| --- | --- | --- |
| `--ink-primary` on ground/hover/selected | 18.58/16.57/16.59 | 7 |
| `--ink-secondary` on ground/hover/selected | 8.76/7.81/7.82 | 7 |
| `--ink-muted` on `--ground` | 4.63 | 4.5 |
| stage fg on its bg (5 badges) | 6.59–9.09 | 4.5 |
| `--danger-fg` on ground/danger-bg | 7.44/6.34 | 4.5 |
| `--ink-inverse` on `--accent` | 7.04 | 4.5 |
| `--focus` on ground/selected | 7.04/6.28 | 3 |
| `--ink-muted` on `--ground-inert`, disabled | 4.13 | 3 |

**The focus ring is inset.** An outline draws outside the box, overlapping the row above and clipping against scroll containers. An inset shadow stays inside the row and costs no layout, so it survives hover and selection at once.

**One alignment per column.** Text left, numerals right, header following its column. Score and finding are one review but two alignments, so they are two columns. No vertical rules: alignment and the mono/proportional split separate them already.

**Cool neutrals, muted stages, one accent.** Every grey carries a blue cast, which lets a tinted hover read as intent rather than a smudge. Forty badges should read as a field of stages, not forty alerts. The accent marks selection, fills the meter and carries the primary action, and sits far from the sky and violet stage hues.

**Flagged is derived.** Done review, score under 40. A 6px dot in a gutter reserved on every row, so names stay aligned.

**One primary action per state.** The bulk bar, empty and error states each carry one filled button. If everything is bold, nothing is.

**44px on fingers, 32px on cursors.** The touch minimum is a finger rule, so controls grow to it behind `pointer: coarse`, not everywhere.

**Keyboard.** Arrows move focus. Space toggles selection. Shift with an arrow extends. Enter opens the panel. Escape closes it, or clears the selection. Focus stays separate from selection; one row is tabbable.

**Motion.** Entrances decelerate, exits accelerate. Every transform sits behind `prefers-reduced-motion: no-preference`; under `reduce` things fade and loops stop.

## Running

```sh
pnpm dev
pnpm test       # jsdom unit tests
pnpm storybook  # permutations
pnpm contrast   # table above
pnpm build      # typecheck and bundle
pnpm exec vitest run --project storybook   # stories + axe
```
