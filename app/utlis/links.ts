const isLinkClickInterceptable = (
  event: MouseEvent,
  anchor: HTMLAnchorElement
): boolean => {
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
  // Check if:window same origin and internal link
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

export {
  isLinkClickInterceptable
}
