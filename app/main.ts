import '@bad-at-coding/styles/main.scss'

class App {
  private contentContainer: HTMLElement | null = null
  private headerContainer: HTMLElement | null = null

  constructor() {
    this.contentContainer = document.querySelector('.content')
    this.headerContainer = document.querySelector('.header')
    this.initRouter()
  }

  private initRouter() {
    // Intercept clicks on links
    document.addEventListener('click', (e) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (anchor && this.isLinkClickInterceptable(e, anchor)) {
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

  private isLinkClickInterceptable(
    event: MouseEvent,
    anchor: HTMLAnchorElement
  ): boolean {
    // Ignore clicks with modifier keys (e.g. Cmd/Ctrl/Shift + Click)
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return false
    }
    // Ignore links with download attribute
    if (anchor.hasAttribute('download')) {
      return false
    }
    // Ignore links with target="_blank"
    if (anchor.target && anchor.target !== '_self') {
      return false
    }
    // Check if same origin and internal link
    const href = anchor.href
    if (!href) return false

    try {
      const url = new URL(href, window.location.origin)
      if (url.origin !== window.location.origin) {
        return false
      }
      // Ignore mailto:, tel:, javascript:, etc.
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return false
      }
      // Ignore clicks on same-page hash links (e.g., href="#section")
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash !== ''
      ) {
        return false
      }
      // Ignore placeholders
      if (anchor.getAttribute('href') === '#') {
        return false
      }
      return true
    } catch {
      return false
    }
  }

  private async navigate(url: string, pushState = true) {
    if (!this.contentContainer) return

    // If it's the exact same pathname/search, avoid redundant fetch
    const currentPath = window.location.pathname + window.location.search
    if (url === currentPath && pushState) {
      return
    }

    // Add transitioning class for exit animation
    this.contentContainer.classList.add('is-transitioning')

    // Wait for the transition to complete (250ms)
    await new Promise((resolve) => setTimeout(resolve, 250))

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load page: ${response.status}`)
      }

      const htmlText = await response.text()
      const parser = new DOMParser()
      const newDoc = parser.parseFromString(htmlText, 'text/html')

      const newContent = newDoc.querySelector('.content')
      const newHeader = newDoc.querySelector('.header')

      if (newContent && this.contentContainer) {
        // Swap content
        this.contentContainer.innerHTML = newContent.innerHTML

        // Update template dataset
        const newTemplate = newContent.getAttribute('data-template') || ''
        this.contentContainer.setAttribute('data-template', newTemplate)

        // Swap header to keep dynamic link paths in sync
        if (newHeader && this.headerContainer) {
          this.headerContainer.innerHTML = newHeader.innerHTML
        }

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
    } finally {
      // Remove transitioning class for entrance animation
      this.contentContainer.classList.remove('is-transitioning')
    }
  }
}

new App()
