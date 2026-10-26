import { getSmoothScroll } from './smooth-scroll.js'

export const initFailCaseGallery = (): void => {
  let currentIndex = 0

  const getGalleryItems = (): HTMLElement[] => {
    return Array.from(
      document.querySelectorAll<HTMLElement>('.js-gallery-item')
    ).filter((el) => !el.classList.contains('is-hidden'))
  }

  const updateLightboxContent = (index: number) => {
    const items = getGalleryItems()
    if (items.length === 0) return

    const normalizedIndex =
      ((index % items.length) + items.length) % items.length
    currentIndex = normalizedIndex

    const item = items[normalizedIndex]
    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    if (!lightbox || !item) return

    const src = item.dataset.src || ''
    const title = item.dataset.title || ''
    const caption = item.dataset.caption || ''
    const photoId = item.dataset.id || ''
    const aspect = item.dataset.aspect || ''
    const file = item.dataset.file || ''

    const imgEl = lightbox.querySelector<HTMLImageElement>('.js-lightbox-img')
    const idEl = lightbox.querySelector<HTMLElement>('.js-lightbox-id')
    const titleEl = lightbox.querySelector<HTMLElement>('.js-lightbox-title')
    const captionEl = lightbox.querySelector<HTMLElement>(
      '.js-lightbox-caption'
    )
    const metaEl = lightbox.querySelector<HTMLElement>('.js-lightbox-meta')

    if (imgEl) {
      imgEl.src = src
      imgEl.alt = title
    }
    if (idEl) {
      idEl.textContent = `[ ${photoId.toUpperCase()} // ${String(normalizedIndex + 1).padStart(2, '0')} OF ${String(items.length).padStart(2, '0')} ]`
    }
    if (titleEl) {
      titleEl.textContent = title
    }
    if (captionEl) {
      captionEl.textContent = caption
    }
    if (metaEl) {
      metaEl.textContent = `${aspect} · ${file}`
    }
  }

  const openLightbox = (index: number) => {
    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    if (!lightbox) return
    updateLightboxContent(index)
    lightbox.classList.add('is-open')
    lightbox.setAttribute('aria-hidden', 'false')
  }

  const closeLightbox = () => {
    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    if (!lightbox) return
    lightbox.classList.remove('is-open')
    lightbox.setAttribute('aria-hidden', 'true')
  }

  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (!target) return

    // 1. Section quick-jump navigation inside scrollable post-mortem container
    const jumpBtn = target.closest<HTMLElement>('.js-section-jump')
    if (jumpBtn) {
      e.preventDefault()
      const targetId = jumpBtn.dataset.target
      if (!targetId) return
      const sectionEl = document.getElementById(targetId)
      if (!sectionEl) return

      const toolbar = document.querySelector<HTMLElement>('.v-feed-06__toolbar')
      const toolbarHeight = toolbar ? toolbar.offsetHeight + 8 : 12
      const smoothScroll = getSmoothScroll()
      if (smoothScroll) {
        smoothScroll.scrollTo(sectionEl, { offset: -toolbarHeight })
      } else {
        const scrollContainer =
          document.querySelector<HTMLElement>('.container__content') ||
          document.querySelector<HTMLElement>('.v-feed-06__scroll')
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect()
          const sectionRect = sectionEl.getBoundingClientRect()
          const offset =
            sectionRect.top -
            containerRect.top +
            scrollContainer.scrollTop -
            toolbarHeight
          scrollContainer.scrollTo({ top: offset, behavior: 'smooth' })
        }
      }
      return
    }

    // 2. Gallery category filter buttons
    const filterBtn = target.closest<HTMLElement>('.js-gallery-filter')
    if (filterBtn) {
      e.preventDefault()
      const category = filterBtn.dataset.filter || 'all'
      const allFilters =
        document.querySelectorAll<HTMLElement>('.js-gallery-filter')
      allFilters.forEach((btn) => {
        btn.classList.toggle('is-active', btn === filterBtn)
      })

      const allItems =
        document.querySelectorAll<HTMLElement>('.js-gallery-item')
      allItems.forEach((item) => {
        const itemCat = item.dataset.category || ''
        const shouldShow = category === 'all' || itemCat === category
        item.classList.toggle('is-hidden', !shouldShow)
      })
      getSmoothScroll()?.resize()
      return
    }

    // 3. Open lightbox when clicking a gallery card
    const galleryItem = target.closest<HTMLElement>('.js-gallery-item')
    if (galleryItem) {
      e.preventDefault()
      const visibleItems = getGalleryItems()
      const idx = visibleItems.indexOf(galleryItem)
      openLightbox(idx >= 0 ? idx : 0)
      return
    }

    // 4. Lightbox controls
    if (target.closest('.js-lightbox-close')) {
      e.preventDefault()
      closeLightbox()
      return
    }

    if (target.closest('.js-lightbox-prev')) {
      e.preventDefault()
      updateLightboxContent(currentIndex - 1)
      return
    }

    if (target.closest('.js-lightbox-next')) {
      e.preventDefault()
      updateLightboxContent(currentIndex + 1)
      return
    }

    // Close when clicking backdrop directly
    if (target.classList.contains('js-gallery-lightbox')) {
      closeLightbox()
    }
  })

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    if (!lightbox || !lightbox.classList.contains('is-open')) return

    if (e.key === 'Escape') {
      closeLightbox()
    } else if (e.key === 'ArrowLeft') {
      updateLightboxContent(currentIndex - 1)
    } else if (e.key === 'ArrowRight') {
      updateLightboxContent(currentIndex + 1)
    }
  })
}
