import gsap from 'gsap'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrambleTextPlugin)

export type TNavbar = {
  update: (newNavbar: HTMLElement) => void
}

export const NAVBAR_ELEMENT = '.nav__content'

export const createNavbar = (): TNavbar => {
  const navbarElement = document.querySelector(NAVBAR_ELEMENT)

  const update = (newNavbar: HTMLElement) => {
    if (newNavbar.children.length > navbarElement!.children.length) {
      const lastElementLink = newNavbar.lastElementChild!.querySelector('.link')
      const lastElementText = lastElementLink?.textContent
      lastElementLink!.textContent = ''

      navbarElement?.appendChild(newNavbar.lastElementChild!)
      gsap.to(lastElementLink, {
        duration: 0.7,
        ease: 'power2.out',
        scrambleText: {
          text: lastElementText || '',
          chars: lastElementText,
          speed: 3,
        },
      })
    } else if (navbarElement!.children.length > newNavbar.children.length) {
      // navbarElement!.removeChild(navbarElement!.lastElementChild!)
      const lastElementLink =
        navbarElement?.lastElementChild!.querySelector('.link')
      const lastElementText = lastElementLink?.textContent
      gsap.to(lastElementLink!, {
        duration: 0.7,
        ease: 'power2.out',
        scrambleText: {
          text: '',
          chars: lastElementText,
          speed: 3,
        },
        onComplete: () => {
          navbarElement?.lastElementChild!.remove()
        },
      })
    }
  }

  return {
    update,
  }
}
