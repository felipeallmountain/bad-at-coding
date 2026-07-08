import { Component } from './component.js'
import gsap from 'gsap'

export class Preloader extends Component {
  constructor() {
    super({
      element: '.preloader',
      classes: {
        lines: '.preloader__line',
      },
    })

    this.animate()
  }

  animate() {
    if (!this.element) return

    const linesElement = this.elements.lines
    const lines =
      linesElement instanceof NodeList
        ? Array.from(linesElement)
        : linesElement instanceof HTMLElement
          ? [linesElement]
          : []

    if (lines.length === 0) {
      this.destroy()
      return
    }

    const tl = gsap.timeline({
      onComplete: () => {
        this.destroy()
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

    tl.to(this.element, {
      opacity: 0,
      yPercent: -100,
      duration: 0.6,
      ease: 'power4.inOut',
      delay: 1,
    })
  }

  destroy() {
    if (this.element) {
      this.element.remove()
    }
    super.destroy()
  }
}
