import { EventEmitter } from './event-emitter.js'
import { isLinkClickInterceptable } from '../utlis/links.js'

export class Router extends EventEmitter {
  constructor() {
    super()
    this.initRouter()
  }

  initRouter() {
    // Intercept clicks on links
    document.addEventListener('click', (e) => {
      const anchor = (e.target as HTMLElement).closest('a')

      if (anchor && isLinkClickInterceptable(e, anchor)) {
        e.preventDefault()
        const url = anchor.getAttribute('href') || '/'
        this.fire('navigate', { url, pushState: true })
      }
    })

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.fire('navigate', { url: window.location.pathname, pushState: false })
    })
  }
}
