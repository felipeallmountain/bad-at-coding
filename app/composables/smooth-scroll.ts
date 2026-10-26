import Lenis, { type ScrollToOptions } from 'lenis'
import Tempus from 'tempus'

export type TSmoothScroll = {
  refresh: () => void
  scrollTo: (
    target: number | string | HTMLElement,
    options?: ScrollToOptions
  ) => void
  resize: () => void
  destroy: () => void
}

let activeInstance: TSmoothScroll | null = null

export const getSmoothScroll = (): TSmoothScroll | null => activeInstance

export const createSmoothScroll = (): TSmoothScroll => {
  let lenis: Lenis | null = null

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

    lenis.scrollTo(0, { immediate: true })
    requestAnimationFrame(() => {
      lenis?.resize()
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
  }

  const destroy = () => {
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
    destroy,
  }

  activeInstance = api
  return api
}
