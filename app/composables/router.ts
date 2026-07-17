import { createEventEmitter, TEventEmitter } from './event-emitter.js'
import { isLinkClickInterceptable } from '../utlis/links.js'

export const createRouter = (): TEventEmitter => {
  const eventEmitter = createEventEmitter()

  const handleLinkClick = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a')

    if (anchor && isLinkClickInterceptable(e, anchor)) {
      e.preventDefault()
      const url = anchor.getAttribute('href') || '/'
      eventEmitter.fire('navigate', { url, pushState: true })
    }
  }

  const handlePopState = () => {
    eventEmitter.fire('navigate', {
      url: window.location.pathname,
      pushState: false,
    })
  }

  document.addEventListener('click', handleLinkClick)
  window.addEventListener('popstate', handlePopState)

  const baseDestroy = eventEmitter.destroy
  const destroy = () => {
    document.removeEventListener('click', handleLinkClick)
    window.removeEventListener('popstate', handlePopState)
    baseDestroy()
  }

  return {
    ...eventEmitter,
    destroy,
  }
}
