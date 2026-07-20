import { createComponent, TComponent } from './component.js'
import gsap from 'gsap'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrambleTextPlugin)

export type TPreloaderOptions = {
  onComplete?: () => void
}

export type TPreloader = TComponent & {
  animate: () => void
}

export const createPreloader = (options?: TPreloaderOptions): TPreloader => {
  const component = createComponent({
    element: '.preloader',
    classes: {
      lines: '.preloader__line',
    },
  })

  const animate = () => {
    if (!component.element) {
      options?.onComplete?.()
      return
    }

    const linesElement = component.elements.lines
    const lines =
      linesElement instanceof NodeList
        ? Array.from(linesElement)
        : linesElement instanceof HTMLElement
          ? [linesElement]
          : []

    if (lines.length === 0) {
      options?.onComplete?.()
      destroy()
      return
    }

    const tl = gsap.timeline({
      onComplete: () => {
        options?.onComplete?.()
        destroy()
      },
    })

    lines.forEach((line) => {
      const htmlLine = line as HTMLElement
      tl.to(htmlLine, {
        opacity: 0.9,
        duration: 0.8,
        delay: 0.8,
        scrambleText: htmlLine.innerHTML,
      })
    })

    tl.to(component.element, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.inOut',
      delay: 0.1,
    })
  }

  const baseDestroy = component.destroy
  const destroy = () => {
    if (component.element) {
      component.element.remove()
    }
    baseDestroy()
  }

  // Trigger animation upon initialization
  animate()

  return {
    ...component,
    animate,
    destroy,
  }
}
