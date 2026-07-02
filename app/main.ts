// @ts-expect-error: path alias import for SCSS file stylesheet
import '@bad-at-coding/styles/main.scss'
import { isLinkClickInterceptable } from './utlis/links.js'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'

const CONTENT_CONTAINER = '.container'
const HEADER_CONTAINER = '.header'

gsap.registerPlugin(Flip)
gsap.registerPlugin(ScrambleTextPlugin)

class App {
  private contentContainer: HTMLElement | null = null
  private headerContainer: HTMLElement | null = null

  constructor() {
    this.contentContainer = document.querySelector(CONTENT_CONTAINER)
    this.headerContainer = document.querySelector(HEADER_CONTAINER)
    this.initPreloader()
    this.initRouter()
  }

  private initPreloader() {
    const preloader = document.querySelector('.preloader')
    const lines = document.querySelectorAll('.preloader__line')

    if (!preloader || lines.length === 0) return

    const tl = gsap.timeline({
      onComplete: () => {
        preloader.remove()
      },
    })

    lines.forEach(line => {
      tl.to(line, {
        opacity: .9,
        duration: .8,
        scrambleText: line.innerHTML,
        delay: .8
      })
    })

    tl.to(preloader, {
      opacity: 0,
      yPercent: -100,
      duration: 0.6,
      ease: 'power4.inOut',
      delay: 2,
    })
  }

  private initRouter() {
    // Intercept clicks on links
    document.addEventListener('click', (e) => {
      const anchor = (e.target as HTMLElement).closest('a')

      if (anchor && isLinkClickInterceptable(e, anchor)) {
        e.preventDefault()
        const url = anchor.getAttribute('href') || '/'
        this.navigate(url)
      }
    })

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.navigate(window.location.pathname, false)
    })
  }

  private async navigate(url: string, pushState = true) {
    if (!this.contentContainer) return

    // If it's the exact same pathname/search, avoid redundant fetch
    const currentPath = window.location.pathname + window.location.search
    if (url === currentPath && pushState) {
      return
    }

    try {
      this.contentContainer.classList.add('is-loading')
      this.contentContainer.replaceChildren()

      const loader = document.createElement('div')
      loader.className = 'container__loader'
      loader.innerHTML = `
        <div class="container__loader-terminal">
          <div class="container__loader-text">> RETRIEVING DATA...</div>
          <div class="container__loader-bar">
            <div class="container__loader-progress"></div>
          </div>
        </div>
      `
      this.contentContainer.appendChild(loader)

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

      const newContent = newDoc.querySelector(CONTENT_CONTAINER)
      const newHeader = newDoc.querySelector(HEADER_CONTAINER)

      if (newContent && this.contentContainer) {
        // Swap content
        const state = Flip.getState(this.contentContainer)

        // Update template dataset
        const oldTemplate =
          this.contentContainer.getAttribute('data-template') || ''
        const newTemplate = newContent.getAttribute('data-template') || ''
        this.contentContainer.setAttribute('data-template', newTemplate)
        this.contentContainer.classList.replace(oldTemplate, newTemplate)

        Flip.from(state, {
          duration: 0.5,
          ease: 'power2.inOut',
          absolute: true,
          onComplete: () => {
            if (this.contentContainer) {
              this.contentContainer.classList.remove('is-loading')
            }
            if (newContent && this.contentContainer) {
              this.contentContainer.innerHTML = newContent.innerHTML
            }
            if (newHeader && this.headerContainer) {
              this.headerContainer.innerHTML = newHeader.innerHTML
            }
          },
        })

        // Swap header to keep dynamic link paths in sync

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
      if (this.contentContainer) {
        this.contentContainer.classList.remove('is-loading')
      }
      console.error(
        'Navigation error, falling back to browser navigation:',
        error
      )
      // Fallback to standard page load
      if (pushState) {
        window.location.href = url
      }
    } finally {
      // Remove transitioning class for entrance animation
      // this.contentContainer.classList.remove('is-transitioning')
    }
  }
}

new App()
