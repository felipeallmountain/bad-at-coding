import { createComponent, TComponent } from './component.js'
import gsap from 'gsap'

export type TPreloader = TComponent & {
  animate: () => void
}

export const createPreloader = (): TPreloader => {
  const component = createComponent({
    element: '.preloader',
    classes: {
      lines: '.preloader__line',
    },
  })

  const animate = () => {
    if (!component.element) return

    const linesElement = component.elements.lines
    const lines =
      linesElement instanceof NodeList
        ? Array.from(linesElement)
        : linesElement instanceof HTMLElement
          ? [linesElement]
          : []

    if (lines.length === 0) {
      destroy()
      return
    }

    const tl = gsap.timeline({
      onComplete: () => {
        destroy()
      },
    })

    lines.forEach((line) => {
      const htmlLine = line as HTMLElement
      tl.to(htmlLine, {
        opacity: 0.9,
        duration: 0.8,
        scrambleText: htmlLine.innerHTML,
        delay: 0.8,
      })
    })

    tl.to(component.element, {
      opacity: 0,
      yPercent: -100,
      duration: 0.6,
      ease: 'power4.inOut',
      delay: 1,
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
