// @ts-expect-error: path alias import for SCSS file stylesheet
import '@bad-at-coding/styles/main.scss'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'
import { Component } from './classes/component.js'
import { Preloader } from './classes/preloader.js'
import { Router } from './classes/router.js'

const CONTENT_CONTAINER = '.container'
const HEADER_CONTAINER = '.header'
const CONTAINER_HEAD = '.container__title'
const CONTAINER_TITLE = `${CONTAINER_HEAD} h1`
const CONTAINER_PARAGRAPH = '.container__paragraph'
const CONTAINER_CONTENT = '.container__content'

gsap.registerPlugin(Flip)
gsap.registerPlugin(ScrambleTextPlugin)

class App extends Component {
  router: Router
  preloader: Preloader

  constructor() {
    super({
      element: 'body',
      classes: {
        contentContainer: CONTENT_CONTAINER,
        headerContainer: HEADER_CONTAINER,
      },
    })

    this.preloader = new Preloader()
    this.router = new Router()
    this.router.on(
      'navigate',
      ({ url, pushState }: { url: string; pushState: boolean }) => {
        this.navigate(url, pushState)
      }
    )
  }

  async navigate(url: string, pushState = true) {
    const contentContainer = this.elements.contentContainer as
      | HTMLElement
      | undefined
    const headerContainer = this.elements.headerContainer as
      | HTMLElement
      | undefined

    if (!contentContainer) return

    // If it's the exact same pathname/search, avoid redundant fetch
    const currentPath = window.location.pathname + window.location.search
    if (url === currentPath && pushState) {
      return
    }

    try {
      const oldTitle = contentContainer.querySelector(
        CONTAINER_TITLE
      ) as HTMLElement | null
      const tl = gsap.timeline()

      if (oldTitle) {
        tl.to(oldTitle, {
          duration: 5,
          ease: 'power2.out',
          repeat: -1,
          scrambleText: {
            text: oldTitle.innerHTML,
            chars: oldTitle.innerHTML,
            speed: 0.5,
            rightToLeft: true,
          },
        })
      }

      const oldParagraph = contentContainer.querySelector(
        CONTAINER_PARAGRAPH
      ) as HTMLElement | null
      const oldParagraphTl = gsap.timeline()
      if (oldParagraph) {
        const oldFragments = oldParagraph.querySelectorAll('p')
        const oldFragmentsList = Array.from(oldFragments)

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

      const response = await fetch(url, {
        headers: {
          'X-requested-with': 'XMLHttpRequest',
        },
      })
      if (!response.ok) {
        throw new Error(`Failed to load page: ${response.status}`)
      }

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
      if (newTitle && oldTitle) {
        tl.kill()
        gsap.to(oldTitle, {
          duration: 0.6,
          ease: 'power2.in',
          scrambleText: {
            text: newTitle.innerHTML,
            speed: 4,
          },
        })
      }

      if (newContent) {
        const state = Flip.getState(contentContainer)
        const newParagraph = newContent.querySelector(
          CONTAINER_PARAGRAPH
        ) as HTMLElement | null
        if (newParagraph) {
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
            oldParagraphTl.kill()
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
        } else {
          if (oldParagraph) {
            oldParagraph.remove()
          }
        }

        // Update body content of the container
        const oldBody = contentContainer.querySelector(
          CONTAINER_CONTENT
        ) as HTMLElement | null
        const newBody = newContent.querySelector(
          CONTAINER_CONTENT
        ) as HTMLElement | null
        if (oldBody && newBody) {
          oldBody.innerHTML = newBody.innerHTML
        }

        // Update template dataset
        const oldTemplate = contentContainer.getAttribute('data-template') || ''
        const newTemplate = newContent.getAttribute('data-template') || ''
        contentContainer.setAttribute('data-template', newTemplate)
        contentContainer.classList.replace(oldTemplate, newTemplate)

        Flip.from(state, {
          duration: 0.5,
          ease: 'power2.inOut',
          absolute: true,
          onComplete: () => {
            if (newHeader && headerContainer) {
              headerContainer.innerHTML = newHeader.innerHTML
            }
          },
        })

        // Update title
        document.title = newDoc.title

        // Scroll to top of the page
        window.scrollTo(0, 0)

        // Push state to browser history
        if (pushState) {
          window.history.pushState({}, '', url)
        }
      } else {
        throw new Error('Content layout missing in new page')
      }
    } catch (error) {
      console.error(
        'Navigation error, falling back to browser navigation:',
        error
      )
      // Fallback to standard page load
      if (pushState) {
        window.location.href = url
      }
    }
  }
}

new App()
