import Lenis, { type ScrollToOptions } from 'lenis'
import Tempus from 'tempus'

export type TScrollCallback = (lenis: Lenis) => void

export type TSmoothScroll = {
  refresh: () => void
  scrollTo: (
    target: number | string | HTMLElement,
    options?: ScrollToOptions
  ) => void
  resize: () => void
  onScroll: (cb: TScrollCallback) => () => void
  destroy: () => void
}

let activeInstance: TSmoothScroll | null = null

export const getSmoothScroll = (): TSmoothScroll | null => activeInstance

export const createSmoothScroll = (): TSmoothScroll => {
  let lenis: Lenis | null = null
  const scrollListeners = new Set<TScrollCallback>()

  const notifyScroll = () => {
    if (!lenis) return
    scrollListeners.forEach((cb) => cb(lenis!))
  }

  const mount = () => {
    lenis?.destroy()
    lenis = null

    const wrapper = document.querySelector<HTMLElement>('.container__content')
    const content = (wrapper?.firstElementChild as HTMLElement | null) ?? null

    if (!wrapper || !content) return

    lenis = new Lenis({
      wrapper,
      content,
      eventsTarget: wrapper,
      lerp: 0.1,
      smoothWheel: true,
      allowNestedScroll: true,
      autoRaf: false,
      prevent: (node: HTMLElement) =>
        Boolean(node.closest('.gallery-lightbox')),
    })

    lenis.on('scroll', () => {
      notifyScroll()
    })

    lenis.scrollTo(0, { immediate: true })
    requestAnimationFrame(() => {
      lenis?.resize()
      notifyScroll()
    })
  }

  mount()

  const unsubscribe = Tempus.add(
    (state: number | { time: number; deltaTime: number }) => {
      const time = typeof state === 'number' ? state : state.time
      lenis?.raf(time)
    }
  )

  const refresh = () => {
    mount()
  }

  const scrollTo = (
    target: number | string | HTMLElement,
    options?: ScrollToOptions
  ) => {
    if (lenis) {
      lenis.scrollTo(target, options)
    }
  }

  const resize = () => {
    lenis?.resize()
    notifyScroll()
  }

  const onScroll = (cb: TScrollCallback) => {
    scrollListeners.add(cb)
    if (lenis) {
      cb(lenis)
    }
    return () => {
      scrollListeners.delete(cb)
    }
  }

  const destroy = () => {
    scrollListeners.clear()
    unsubscribe?.()
    lenis?.destroy()
    lenis = null
    if (activeInstance === api) {
      activeInstance = null
    }
  }

  const api: TSmoothScroll = {
    refresh,
    scrollTo,
    resize,
    onScroll,
    destroy,
  }

  activeInstance = api
  return api
}
