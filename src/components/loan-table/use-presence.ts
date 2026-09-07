import { useEffect, useState } from 'react'

/**
 * Keeps a element mounted for the length of its exit transition.
 *
 * Entrances are handled in CSS with @starting-style, so nothing here has to
 * flip a class on the next frame. This hook only answers one question: is the
 * element still on screen? While `active` is false but the exit is still
 * running, `present` stays true and `state` reads 'closed', which is the hook
 * the stylesheet transitions against.
 */
export function usePresence(active: boolean, exitDuration: number) {
  const [present, setPresent] = useState(active)

  useEffect(() => {
    if (active) {
      setPresent(true)
      return
    }
    const timer = setTimeout(() => setPresent(false), exitDuration)
    return () => clearTimeout(timer)
  }, [active, exitDuration])

  return {
    present: present || active,
    state: active ? ('open' as const) : ('closed' as const),
  }
}
