import { useCallback, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

/**
 * Row selection + roving focus for a `role="grid"` table.
 *
 * Focus and selection are deliberately separate pieces of state: moving the
 * roving focus never changes what is selected. Only Space, Shift+Arrow and
 * Escape touch the selection.
 *
 * Keyboard contract:
 *   ArrowUp / ArrowDown  move focus
 *   Space                toggle selection of the focused row
 *   Shift+ArrowUp/Down   move focus and extend selection from the anchor
 *   Enter                open the focused row
 *   Escape               clear the selection
 */

export interface UseSelectionOptions<T> {
  items: readonly T[]
  getId: (item: T) => string
  onOpen?: (item: T) => void
}

export interface RowProps {
  ref: (element: HTMLTableRowElement | null) => void
  tabIndex: number
  'aria-selected': boolean
  'data-focused': '' | undefined
  onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => void
  onFocus: () => void
}

export interface UseSelectionResult<T> {
  focusedIndex: number
  selectedIds: ReadonlySet<string>
  selectedCount: number
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  setFocusedIndex: (index: number) => void
  handleKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => void
  getRowProps: (item: T, index: number) => RowProps
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function rangeBetween(a: number, b: number): number[] {
  const start = Math.min(a, b)
  const end = Math.max(a, b)
  const out: number[] = []
  for (let i = start; i <= end; i += 1) out.push(i)
  return out
}

export function useSelection<T>({
  items,
  getId,
  onOpen,
}: UseSelectionOptions<T>): UseSelectionResult<T> {
  const [rawFocusedIndex, setFocusedIndexState] = useState(0)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())

  const rowElements = useRef(new Map<number, HTMLTableRowElement>())
  /** Where a Shift+Arrow range extension started. */
  const anchorIndex = useRef<number | null>(null)
  /** Selection as it stood when the current extension began. */
  const baseSelection = useRef<ReadonlySet<string>>(new Set())

  const lastIndex = items.length - 1

  // Derived during render so the roving focus stays inside the list as rows are
  // filtered in and out, without an extra state-syncing pass.
  const focusedIndex = items.length === 0 ? 0 : clamp(rawFocusedIndex, 0, lastIndex)

  const registerRow = useCallback((index: number, element: HTMLTableRowElement | null) => {
    if (element) rowElements.current.set(index, element)
    else rowElements.current.delete(index)
  }, [])

  const setFocusedIndex = useCallback((index: number) => {
    setFocusedIndexState(index)
  }, [])

  /** Move the roving tabindex and pull DOM focus along with it. */
  const moveFocusTo = useCallback((index: number) => {
    setFocusedIndexState(index)
    rowElements.current.get(index)?.focus()
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getId)))
  }, [items, getId])

  const clearSelection = useCallback(() => {
    anchorIndex.current = null
    setSelectedIds(new Set())
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (items.length === 0) return

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp': {
          event.preventDefault()
          const direction = event.key === 'ArrowDown' ? 1 : -1
          const nextIndex = clamp(focusedIndex + direction, 0, lastIndex)

          if (event.shiftKey) {
            // Begin a new extension from the current row if none is running.
            if (anchorIndex.current === null) {
              anchorIndex.current = focusedIndex
              baseSelection.current = selectedIds
            }
            const anchor = anchorIndex.current
            const inRange = rangeBetween(anchor, nextIndex).map((i) => getId(items[i]))
            setSelectedIds(new Set([...baseSelection.current, ...inRange]))
          } else {
            anchorIndex.current = null
          }

          moveFocusTo(nextIndex)
          break
        }

        case ' ':
        case 'Spacebar': {
          event.preventDefault()
          anchorIndex.current = focusedIndex
          baseSelection.current = selectedIds
          toggle(getId(items[focusedIndex]))
          break
        }

        case 'Enter': {
          event.preventDefault()
          onOpen?.(items[focusedIndex])
          break
        }

        case 'Escape': {
          event.preventDefault()
          clearSelection()
          break
        }

        default:
          break
      }
    },
    [items, getId, focusedIndex, lastIndex, selectedIds, moveFocusTo, toggle, onOpen, clearSelection],
  )

  const getRowProps = useCallback(
    (item: T, index: number): RowProps => ({
      ref: (element) => registerRow(index, element),
      // Roving tabindex: exactly one row is tabbable at a time.
      tabIndex: index === focusedIndex ? 0 : -1,
      'aria-selected': selectedIds.has(getId(item)),
      'data-focused': index === focusedIndex ? '' : undefined,
      onKeyDown: handleKeyDown,
      onFocus: () => setFocusedIndexState(index),
    }),
    [focusedIndex, selectedIds, getId, handleKeyDown, registerRow],
  )

  const selectedCount = selectedIds.size

  return useMemo(
    () => ({
      focusedIndex,
      selectedIds,
      selectedCount,
      isSelected,
      toggle,
      selectAll,
      clearSelection,
      setFocusedIndex,
      handleKeyDown,
      getRowProps,
    }),
    [
      focusedIndex,
      selectedIds,
      selectedCount,
      isSelected,
      toggle,
      selectAll,
      clearSelection,
      setFocusedIndex,
      handleKeyDown,
      getRowProps,
    ],
  )
}
