import gsap from 'gsap'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrambleTextPlugin)

export const initScrambleLinks = () => {
  let currentLink: HTMLElement | null = null

  document.addEventListener('mouseover', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    const link = target?.closest('a') as HTMLElement | null

    if (!link || link === currentLink) return
    if (link.hasAttribute('data-no-scramble')) return

    // Avoid wiping out child DOM nodes (e.g. <img> inside media links);
    // scramble only a designated text child if present, otherwise skip.
    const scrambleTarget =
      link.children.length > 0
        ? link.querySelector<HTMLElement>('.js-scramble-text')
        : link

    if (!scrambleTarget) return
    currentLink = link

    if (!scrambleTarget.dataset.originalText) {
      scrambleTarget.dataset.originalText =
        scrambleTarget.textContent?.trim() || ''
    }

    const originalText = scrambleTarget.dataset.originalText
    if (!originalText) return

    const length = originalText.length
    const speed = 4
    const duration = Math.min(1.2, Math.max(0.6, 0.45 + length * 0.015))

    gsap.to(scrambleTarget, {
      duration,
      ease: 'power2.out',
      scrambleText: {
        text: originalText,
        chars: 'upperAndLowerCase',
        speed,
      },
      overwrite: 'auto',
    })
  })

  document.addEventListener('mouseout', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    const link = target?.closest('a') as HTMLElement | null
    const related = e.relatedTarget as HTMLElement | null

    if (link && !link.contains(related)) {
      if (currentLink === link) {
        currentLink = null
      }
    }
  })
}
