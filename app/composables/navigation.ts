import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'
import { createEventEmitter, TEventEmitter } from './event-emitter.js'
import { NAVBAR_ELEMENT } from './navbar.js'

const CONTENT_CONTAINER = '.container'
const HEADER_CONTAINER = '.header'
const CONTAINER_HEAD = '.container__title'
const CONTAINER_TITLE = `${CONTAINER_HEAD} h1`
const CONTAINER_PARAGRAPH = '.container__paragraph'
const CONTAINER_CONTENT = '.container__content'

gsap.registerPlugin(Flip)
gsap.registerPlugin(ScrambleTextPlugin)

export type TNavigation = TEventEmitter & {
  navigate: (url: string, pushState?: boolean) => Promise<void>
}

export const createNavigation = (): TNavigation => {
  const eventEmitter = createEventEmitter()

  const animateOldTitle = (tl: gsap.core.Timeline, oldTitle: HTMLElement) => {
    tl.to(oldTitle, {
      duration: 5,
      ease: 'power2.out',
      repeat: -1,
      scrambleText: {
        text: 'LOADING',
        chars: oldTitle.innerHTML,
        speed: 3,
        rightToLeft: true,
      },
    })
  }

  const animateOldParagraph = (oldParagraph: HTMLElement) => {
    const oldFragments = oldParagraph.querySelectorAll('p')
    const oldFragmentsList = Array.from(oldFragments)
    if (oldFragmentsList.length === 0) return

    oldFragmentsList.reverse().forEach((frag) => {
      gsap.to(frag, {
        duration: 5,
        ease: 'power2.out',
        repeat: -1,
        scrambleText: {
          chars: 'upperAndLowerCase',
          text: frag.textContent || '',
          speed: 1,
          rightToLeft: true,
        },
      })
    })
  }

  const animateNewTitle = (
    oldTitle: HTMLElement,
    newTitle: HTMLElement,
    tl: gsap.core.Timeline
  ) => {
    tl.kill()
    gsap.to(oldTitle, {
      duration: 0.6,
      ease: 'power2.in',
      scrambleText: {
        text: newTitle.innerHTML,
        speed: 4,
      },
      onComplete: () => {
        oldTitle.parentElement!.className = newTitle.parentElement!.className
      },
    })
  }

  const animateNewParagraph = (
    newParagraph: HTMLElement,
    contentContainer: HTMLElement,
    oldParagraph: HTMLElement | null
  ) => {
    const paragraphFragments = newParagraph.querySelectorAll('p')
    const fragmentList = Array.from(paragraphFragments)
    const containerHead = contentContainer.querySelector(
      CONTAINER_HEAD
    ) as HTMLElement | null
    if (fragmentList.length > 0 && containerHead) {
      let paragraphContainer: HTMLElement
      if (oldParagraph) {
        oldParagraph.replaceChildren()
        paragraphContainer = oldParagraph
      } else {
        const emptyParagraph = document.createElement('div')
        emptyParagraph.className =
          'container__paragraph code-command-lg text-color-default'
        containerHead.append(emptyParagraph)
        paragraphContainer = emptyParagraph
      }

      const oldParagraphTl = gsap.timeline()
      oldParagraphTl.delay(0.6)

      fragmentList.forEach((fragment) => {
        const paragraph = document.createElement('p')
        paragraphContainer.append(paragraph)
        oldParagraphTl.to(paragraph, {
          duration: 0.4,
          ease: 'power2.in',
          scrambleText: {
            text: fragment.textContent || '',
            speed: 4,
          },
        })
      })
    }
  }

  const updateBodyContent = (
    contentContainer: HTMLElement,
    newContent: HTMLElement,
    newDoc: Document,
    pushState: boolean,
    url: string
  ) => {
    const oldBody = contentContainer.querySelector(
      CONTAINER_CONTENT
    ) as HTMLElement | null
    const newBody = newContent.querySelector(
      CONTAINER_CONTENT
    ) as HTMLElement | null
    if (oldBody && newBody) {
      oldBody.replaceChildren(...Array.from(newBody.childNodes))
      oldBody.className = newBody.className
      oldBody.scrollTop = 0
    }
    const desktopContent = contentContainer.querySelector<HTMLElement>(
      '.container__desktop-content'
    )
    if (desktopContent) {
      desktopContent.scrollTop = 0
    }
    const oldTemplate = contentContainer.getAttribute('data-template') || ''
    const newTemplate = newContent.getAttribute('data-template') || ''
    contentContainer.setAttribute('data-template', newTemplate)
    contentContainer.classList.replace(oldTemplate, newTemplate)

    document.title = newDoc.title
    const newCanonical = newDoc.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )
    const oldCanonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )
    if (newCanonical && oldCanonical) {
      oldCanonical.href = newCanonical.href
    }

    const metaSelector =
      'meta[name="description"], meta[name="keywords"], meta[name="author"], meta[property^="og:"], meta[property^="article:"], meta[name^="twitter:"]'
    document.head
      .querySelectorAll(metaSelector)
      .forEach((metaEl) => metaEl.remove())
    newDoc.head.querySelectorAll(metaSelector).forEach((metaEl) => {
      document.head.appendChild(metaEl.cloneNode(true))
    })

    window.scrollTo(0, 0)
    if (pushState) {
      window.history.pushState({}, '', url)
    }

    return { newTemplate, oldTemplate }
  }

  const animateContainerFragment = (
    container: HTMLElement,
    state: Flip.FlipState,
    ease: gsap.EaseString
  ): Promise<Flip.FlipState> => {
    return new Promise((resolve) => {
      Flip.from(state, {
        delay: 0.07,
        duration: 0.4,
        ease,
        absolute: true,
        onComplete: () => {
          resolve(Flip.getState(container))
        },
      })
    })
  }

  const swapPageLayout = async (
    contentContainer: HTMLElement,
    state: Flip.FlipState,
    oldTemplate: string,
    newTemplate: string,
    gridPosition: 'col-start' | 'col-end' | 'row-start' | 'row-end',
    ease: gsap.EaseString
  ) => {
    contentContainer.classList.replace(
      `${oldTemplate}--${gridPosition}`,
      `${newTemplate}--${gridPosition}`
    )

    return await animateContainerFragment(contentContainer, state, ease)
  }

  const fitPageContent = async (
    state: Flip.FlipState,
    contentContainer: HTMLElement,
    oldTemplate: string,
    newTemplate: string
  ) => {
    const isUnifiedMobileGrid = window.matchMedia('(max-width: 1024px)').matches

    if (isUnifiedMobileGrid) {
      const positions: Array<
        'col-start' | 'col-end' | 'row-start' | 'row-end'
      > = ['col-end', 'col-start', 'row-start', 'row-end']
      positions.forEach((pos) => {
        contentContainer.classList.replace(
          `${oldTemplate}--${pos}`,
          `${newTemplate}--${pos}`
        )
      })
      const contentBody =
        contentContainer.querySelector<HTMLElement>(CONTAINER_CONTENT)
      if (contentBody) {
        await gsap.fromTo(
          contentBody,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: 'power2.out',
            clearProps: 'transform,translate,rotate,scale,opacity',
          }
        )
      }
      return
    }

    let newState = state
    newState = await swapPageLayout(
      contentContainer,
      newState,
      oldTemplate,
      newTemplate,
      'col-end',
      'back.in'
    )
    newState = await swapPageLayout(
      contentContainer,
      newState,
      oldTemplate,
      newTemplate,
      'col-start',
      'back.in'
    )
    newState = await swapPageLayout(
      contentContainer,
      newState,
      oldTemplate,
      newTemplate,
      'row-start',
      'back.out'
    )
    await swapPageLayout(
      contentContainer,
      newState,
      oldTemplate,
      newTemplate,
      'row-end',
      'back.out'
    )
  }

  const navigate = async (url: string, pushState = true) => {
    const contentContainer = document.querySelector(CONTENT_CONTAINER) as
      | HTMLElement
      | undefined

    if (!contentContainer) return

    const currentPath = window.location.pathname + window.location.search
    if (url === currentPath && pushState) {
      return
    }

    try {
      const oldTitle = contentContainer.querySelector(
        CONTAINER_TITLE
      ) as HTMLElement | null
      const tl = gsap.timeline()
      const oldParagraph = contentContainer.querySelector(
        CONTAINER_PARAGRAPH
      ) as HTMLElement | null

      if (oldTitle) {
        animateOldTitle(tl, oldTitle)
      }
      if (oldParagraph) {
        animateOldParagraph(oldParagraph)
      }

      const response = await fetch(url, {
        headers: {
          'X-requested-with': 'XMLHttpRequest',
        },
      })

      const htmlText = await response.text()
      const parser = new DOMParser()
      const newDoc = parser.parseFromString(htmlText, 'text/html')

      const newContent = newDoc.querySelector(
        CONTENT_CONTAINER
      ) as HTMLElement | null
      const newHeader = newDoc.querySelector(
        HEADER_CONTAINER
      ) as HTMLElement | null

      const newTitle = newDoc.querySelector(
        CONTAINER_TITLE
      ) as HTMLElement | null

      // 404/500 pages still return the site layout — transition into them
      // instead of hard-reloading (which would re-run the preloader).
      if (!response.ok && !(newContent && newHeader)) {
        throw new Error(`Failed to load page: ${response.status}`)
      }

      if (newTitle && oldTitle) {
        animateNewTitle(oldTitle, newTitle, tl)
      }

      if (newContent && newHeader) {
        const state = Flip.getState(contentContainer)
        const newParagraph = newContent.querySelector(
          CONTAINER_PARAGRAPH
        ) as HTMLElement | null
        if (newParagraph) {
          animateNewParagraph(newParagraph, contentContainer, oldParagraph)
        } else {
          if (oldParagraph) {
            oldParagraph.remove()
          }
        }

        const { newTemplate, oldTemplate } = updateBodyContent(
          contentContainer,
          newContent,
          newDoc,
          pushState,
          url
        )

        await fitPageContent(state, contentContainer, oldTemplate, newTemplate)

        const newNavbar = newHeader.querySelector(NAVBAR_ELEMENT)
        if (newNavbar) {
          eventEmitter.fire('updateNavbar', { newNavbar })
        }
      } else {
        throw new Error('Content layout missing in new page')
      }
    } catch (error) {
      console.error(
        'Navigation error, falling back to browser navigation:',
        error
      )
      if (pushState) {
        window.location.href = url
      }
    }
  }

  return {
    ...eventEmitter,
    navigate,
  }
}
