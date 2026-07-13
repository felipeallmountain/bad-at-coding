import autoBind from 'auto-bind'
import { createNanoEvents, Emitter, Unsubscribe } from 'nanoevents'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Listener = (...args: any[]) => void

export class EventEmitter {
  emitter: Emitter
  entries: Map<Listener, Unsubscribe> = new Map()

  constructor() {
    autoBind(this)

    this.emitter = createNanoEvents()
  }

  on(event: string, callback: Listener) {
    if (!callback) {
      return console.trace('No callback provided')
    }

    const emitter = this.emitter.on(event, callback)

    this.entries.set(callback, emitter)

    return emitter
  }

  off(_: string, callback: Listener) {
    const unsubscribe = this.entries.get(callback)

    unsubscribe && unsubscribe()
    this.entries.delete(callback)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fire(event: string, ...args: any[]) {
    this.emitter.emit(event, ...args)
  }

  destroy() {
    this.entries.forEach((unsubscribe) => unsubscribe())
    this.entries.clear()
  }
}
