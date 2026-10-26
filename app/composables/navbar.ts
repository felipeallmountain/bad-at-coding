import gsap from 'gsap'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrambleTextPlugin)

export type TNavbar = {
  update: (newNavbar: HTMLElement) => void
}

export const NAVBAR_ELEMENT = '.nav__content'

export const createNavbar = (): TNavbar => {
  const navbarElement = document.querySelector(
    NAVBAR_ELEMENT
  ) as HTMLElement | null

  const update = (newNavbar: HTMLElement) => {
    if (!navbarElement) return

    const oldItems = Array.from(navbarElement.children) as HTMLElement[]
    const newItems = Array.from(newNavbar.children) as HTMLElement[]
    const commonLength = Math.min(oldItems.length, newItems.length)

    // Update any existing breadcrumb items whose href or label changed
    for (let i = 1; i < commonLength; i++) {
      const oldLink = oldItems[i]?.querySelector(
        '.link'
      ) as HTMLAnchorElement | null
      const newLink = newItems[i]?.querySelector(
        '.link'
      ) as HTMLAnchorElement | null
      if (oldLink && newLink) {
        const newHref = newLink.getAttribute('href') || '/'
        const newText = newLink.textContent?.trim() || ''
        oldLink.setAttribute('href', newHref)
        oldLink.dataset.originalText = newText
        if (oldLink.textContent?.trim() !== newText) {
          gsap.to(oldLink, {
            duration: 0.6,
            ease: 'power2.out',
            scrambleText: {
              text: newText,
              chars: newText,
              speed: 3,
            },
          })
        }
      }
    }

    // Append any newly added breadcrumb levels
    if (newItems.length > oldItems.length) {
      for (let i = oldItems.length; i < newItems.length; i++) {
        const clonedItem = newItems[i].cloneNode(true) as HTMLElement
        const linkEl = clonedItem.querySelector(
          '.link'
        ) as HTMLAnchorElement | null
        const linkText = linkEl?.textContent?.trim() || ''
        if (linkEl) {
          linkEl.dataset.originalText = linkText
          linkEl.textContent = ''
        }
        navbarElement.appendChild(clonedItem)
        if (linkEl) {
          gsap.to(linkEl, {
            duration: 0.7,
            ease: 'power2.out',
            scrambleText: {
              text: linkText,
              chars: linkText,
              speed: 3,
            },
          })
        }
      }
    } else if (oldItems.length > newItems.length) {
      // Remove any trailing breadcrumb levels
      for (let i = oldItems.length - 1; i >= newItems.length; i--) {
        const itemToRemove = oldItems[i]
        const linkEl = itemToRemove.querySelector(
          '.link'
        ) as HTMLAnchorElement | null
        const linkText = linkEl?.textContent?.trim() || ''
        if (linkEl) {
          gsap.to(linkEl, {
            duration: 0.5,
            ease: 'power2.out',
            scrambleText: {
              text: '',
              chars: linkText,
              speed: 3,
            },
            onComplete: () => {
              itemToRemove.remove()
            },
          })
        } else {
          itemToRemove.remove()
        }
      }
    }
  }

  return {
    update,
  }
}
