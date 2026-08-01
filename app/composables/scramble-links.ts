import gsap from 'gsap'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrambleTextPlugin)

export const initScrambleLinks = () => {
  let currentLink: HTMLElement | null = null

  document.addEventListener('mouseover', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    const link = target?.closest('a') as HTMLElement | null

    if (!link || link === currentLink) return
    currentLink = link

    if (!link.dataset.originalText) {
      link.dataset.originalText = link.textContent?.trim() || ''
    }

    const originalText = link.dataset.originalText
    if (!originalText) return

    const length = originalText.length
    const speed = 4
    const duration = Math.min(1.2, Math.max(0.6, 0.45 + length * 0.015))

    gsap.to(link, {
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
