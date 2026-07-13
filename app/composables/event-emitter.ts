import { createNanoEvents, Unsubscribe } from 'nanoevents'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TListener = (...args: any[]) => void

export interface IEventEmitter {
  on: (event: string, callback: TListener) => Unsubscribe | void
  off: (event: string, callback: TListener) => void
  fire: (event: string, ...args: unknown[]) => void
  destroy: () => void
}

export function createEventEmitter(): IEventEmitter {
  const emitter = createNanoEvents()
  const entries = new Map<TListener, Unsubscribe>()

  return {
    on(event: string, callback: TListener) {
      if (!callback) {
        return console.trace('No callback provided')
      }

      const unsubscribe = emitter.on(event, callback)
      entries.set(callback, unsubscribe)
      return unsubscribe
    },

    off(_: string, callback: TListener) {
      const unsubscribe = entries.get(callback)
      if (unsubscribe) {
        unsubscribe()
      }
      entries.delete(callback)
    },

    fire(event: string, ...args: unknown[]) {
      emitter.emit(event, ...args)
    },

    destroy() {
      entries.forEach((unsubscribe) => unsubscribe())
      entries.clear()
    },
  }
}
