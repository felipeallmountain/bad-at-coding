import gsap from 'gsap'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'
import { getSmoothScroll } from './smooth-scroll.js'

gsap.registerPlugin(ScrambleTextPlugin)

export type TFailCaseGallery = {
  refresh: () => void
}

const storeOriginalText = (el: HTMLElement): string => {
  if (!el.dataset.originalText) {
    el.dataset.originalText = el.textContent?.trim() || ''
  }
  return el.dataset.originalText
}

const scrambleElement = (
  el: HTMLElement,
  options?: { delay?: number; duration?: number; speed?: number }
) => {
  const originalText = storeOriginalText(el)
  if (!originalText) return

  const length = originalText.length
  const duration =
    options?.duration ?? Math.min(1.05, Math.max(0.45, 0.35 + length * 0.012))
  const speed = options?.speed ?? 4

  gsap.to(el, {
    delay: options?.delay ?? 0,
    duration,
    ease: 'power2.out',
    scrambleText: {
      text: originalText,
      chars: 'upperAndLowerCase',
      speed,
    },
    overwrite: 'auto',
  })
}

export const initFailCaseGallery = (): TFailCaseGallery => {
  let currentIndex = 0
  let sectionObserver: IntersectionObserver | null = null
  let itemObserver: IntersectionObserver | null = null
  let unsubscribeScroll: (() => void) | null = null
  let currentHoveredBtn: HTMLElement | null = null

  const getGalleryItems = (): HTMLElement[] => {
    return Array.from(
      document.querySelectorAll<HTMLElement>('.js-gallery-item')
    ).filter((el) => !el.classList.contains('is-hidden'))
  }

  // ==========================================================================
  // 1. PARALLAX & ACTIVE SECTION TRACKING
  // ==========================================================================
  const updateParallax = () => {
    const wrapper = document.querySelector<HTMLElement>(
      '.v-feed-06 .container__content'
    )
    if (!wrapper) return

    const wrapperRect = wrapper.getBoundingClientRect()
    const viewportCenterY = wrapperRect.top + wrapperRect.height * 0.5

    // Structural parallax elements (disabled on narrow single-column mobile to prevent overlap)
    const isNarrowMobile = window.matchMedia('(max-width: 640px)').matches
    const parallaxEls = wrapper.querySelectorAll<HTMLElement>('[data-parallax]')
    parallaxEls.forEach((el) => {
      if (el.classList.contains('is-hidden')) return
      if (isNarrowMobile) {
        el.style.setProperty('--parallax-y', '0px')
        return
      }
      const speed = parseFloat(el.dataset.parallax || '0')
      if (!speed) return

      const rect = el.getBoundingClientRect()
      const elCenterY = rect.top + rect.height * 0.5
      const deltaY = elCenterY - viewportCenterY
      const offset = Math.max(-28, Math.min(28, deltaY * speed))
      el.style.setProperty('--parallax-y', `${offset.toFixed(2)}px`)
    })

    // Gallery image window parallax
    const parallaxImgs = wrapper.querySelectorAll<HTMLElement>(
      '[data-parallax-img]'
    )
    parallaxImgs.forEach((img) => {
      const card = img.closest<HTMLElement>('.evidence-card')
      if (card?.classList.contains('is-hidden')) return

      const media = img.parentElement
      if (!media) return

      const speed = parseFloat(img.dataset.parallaxImg || '0.14')
      const rect = media.getBoundingClientRect()
      const mediaCenterY = rect.top + rect.height * 0.5
      const deltaY = mediaCenterY - viewportCenterY
      const offset = Math.max(-18, Math.min(18, deltaY * -speed))
      img.style.setProperty('--parallax-img-y', `${offset.toFixed(2)}px`)
    })

    // Active section highlight in sticky toolbar
    const jumpBtns = wrapper.querySelectorAll<HTMLElement>('.js-section-jump')
    if (jumpBtns.length > 0) {
      let activeId = 'section-dossier'
      const triggerLine = wrapperRect.top + wrapperRect.height * 0.32
      const sections = wrapper.querySelectorAll<HTMLElement>(
        '.dossier-section[id]'
      )
      sections.forEach((sec) => {
        const rect = sec.getBoundingClientRect()
        if (rect.top <= triggerLine) {
          activeId = sec.id
        }
      })
      jumpBtns.forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.target === activeId)
      })
    }
  }

  // ==========================================================================
  // 2. SCROLL-REVEAL FADE-IN & SCRAMBLE TEXT OBSERVERS
  // ==========================================================================
  const mountScrollEffects = () => {
    sectionObserver?.disconnect()
    itemObserver?.disconnect()
    sectionObserver = null
    itemObserver = null

    unsubscribeScroll?.()
    unsubscribeScroll = null

    const wrapper = document.querySelector<HTMLElement>(
      '.v-feed-06 .container__content'
    )
    if (!wrapper) return

    // Pre-cache original text on all [data-scramble] elements
    const allScrambleEls =
      wrapper.querySelectorAll<HTMLElement>('[data-scramble]')
    allScrambleEls.forEach((el) => {
      storeOriginalText(el)
    })

    // Animate sticky toolbar entrance
    const toolbar = wrapper.querySelector<HTMLElement>('.v-feed-06__toolbar')
    if (toolbar) {
      gsap.fromTo(
        toolbar,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      )
      const badge = toolbar.querySelector<HTMLElement>('.toolbar__badge')
      if (badge) {
        scrambleElement(badge, { delay: 0.1, duration: 0.75 })
      }
    }

    // Prepare sections & items for scroll reveal
    const sections = wrapper.querySelectorAll<HTMLElement>(
      '[data-reveal-section]'
    )
    const items = wrapper.querySelectorAll<HTMLElement>('[data-reveal-item]')

    sections.forEach((section) => {
      const heading = section.querySelector<HTMLElement>(
        '.section-heading, .dossier-header__top'
      )
      if (heading) {
        gsap.set(heading, { opacity: 0, y: 14 })
      }
      const lines = section.querySelectorAll<HTMLElement>(
        ':scope > .line, :scope > .top-line, :scope > .bottom-line'
      )
      if (lines.length > 0) {
        gsap.set(lines, { scaleX: 0, transformOrigin: 'left center' })
      }
    })

    items.forEach((item) => {
      gsap.set(item, { opacity: 0, y: 22 })
    })

    // Observer for section headers & blueprint border lines
    sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const section = entry.target as HTMLElement
          sectionObserver?.unobserve(section)

          const lines = section.querySelectorAll<HTMLElement>(
            ':scope > .line, :scope > .top-line, :scope > .bottom-line'
          )
          if (lines.length > 0) {
            gsap.to(lines, {
              scaleX: 1,
              duration: 0.65,
              stagger: 0.1,
              ease: 'power3.out',
            })
          }

          const heading = section.querySelector<HTMLElement>(
            '.section-heading, .dossier-header__top'
          )
          if (heading) {
            gsap.to(heading, {
              opacity: 1,
              y: 0,
              duration: 0.55,
              ease: 'power3.out',
            })

            const headingScrambles =
              heading.querySelectorAll<HTMLElement>('[data-scramble]')
            headingScrambles.forEach((el, idx) => {
              scrambleElement(el, { delay: 0.06 * idx })
            })
          }

          // Also scramble table headers if present in this section
          const tableHeaders = section.querySelectorAll<HTMLElement>(
            'thead [data-scramble]'
          )
          tableHeaders.forEach((th, idx) => {
            scrambleElement(th, { delay: 0.1 + idx * 0.06 })
          })
        })
      },
      {
        root: wrapper,
        threshold: 0.08,
        rootMargin: '0px 0px -4% 0px',
      }
    )

    sections.forEach((sec) => sectionObserver?.observe(sec))

    // Observer for staggered cards, code blocks, gallery frames, and receipt rows
    let pendingBatch: HTMLElement[] = []
    let batchRaf: number | null = null

    const flushBatch = () => {
      batchRaf = null
      if (pendingBatch.length === 0) return

      const batch = pendingBatch.slice()
      pendingBatch = []

      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.055,
        ease: 'power3.out',
        overwrite: 'auto',
      })

      batch.forEach((item, itemIdx) => {
        // Scramble only direct/owned [data-scramble] elements (avoid double-scrambling nested reveal-items)
        const scrambleTargets = Array.from(
          item.querySelectorAll<HTMLElement>('[data-scramble]')
        ).filter((el) => el.closest<HTMLElement>('[data-reveal-item]') === item)

        scrambleTargets.forEach((el, sIdx) => {
          scrambleElement(el, {
            delay: itemIdx * 0.055 + sIdx * 0.04,
          })
        })
      })
    }

    itemObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const item = entry.target as HTMLElement
          itemObserver?.unobserve(item)
          pendingBatch.push(item)
        })

        if (pendingBatch.length > 0 && batchRaf === null) {
          batchRaf = requestAnimationFrame(flushBatch)
        }
      },
      {
        root: wrapper,
        threshold: 0.08,
        rootMargin: '0px 0px -3% 0px',
      }
    )

    items.forEach((item) => itemObserver?.observe(item))

    // Hook continuous parallax into both Lenis scroll and native touch scroll
    const smoothScroll = getSmoothScroll()
    const offLenis = smoothScroll
      ? smoothScroll.onScroll(() => {
          updateParallax()
        })
      : null
    wrapper.addEventListener('scroll', updateParallax, { passive: true })
    unsubscribeScroll = () => {
      offLenis?.()
      wrapper.removeEventListener('scroll', updateParallax)
    }

    requestAnimationFrame(() => {
      updateParallax()
    })
  }

  // ==========================================================================
  // 3. LIGHTBOX & GALLERY CONTROLS
  // ==========================================================================
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
      gsap.fromTo(
        imgEl,
        { opacity: 0, scale: 0.985 },
        { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }
      )
    }
    if (idEl) {
      const idText = `[ ${photoId.toUpperCase()} // ${String(normalizedIndex + 1).padStart(2, '0')} OF ${String(items.length).padStart(2, '0')} ]`
      idEl.dataset.originalText = idText
      idEl.textContent = idText
      scrambleElement(idEl, { duration: 0.55 })
    }
    if (titleEl) {
      titleEl.dataset.originalText = title
      titleEl.textContent = title
      scrambleElement(titleEl, { duration: 0.65 })
    }
    if (captionEl) {
      captionEl.textContent = caption
      gsap.fromTo(
        captionEl,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      )
    }
    if (metaEl) {
      metaEl.textContent = `${aspect} · ${file}`
    }
  }

  const openLightbox = (index: number) => {
    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    if (!lightbox) return
    lightbox.classList.add('is-open')
    lightbox.setAttribute('aria-hidden', 'false')

    const dialog = lightbox.querySelector<HTMLElement>(
      '.gallery-lightbox__dialog'
    )
    if (dialog) {
      gsap.fromTo(
        dialog,
        { opacity: 0, y: 16, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out' }
      )
    }
    updateLightboxContent(index)
  }

  const closeLightbox = () => {
    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    if (!lightbox) return
    lightbox.classList.remove('is-open')
    lightbox.setAttribute('aria-hidden', 'true')
  }

  // Hover scramble on interactive buttons (.js-section-jump, .js-gallery-filter, .lightbox-btn)
  document.addEventListener('mouseover', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    const btn = target?.closest<HTMLElement>(
      '.js-section-jump, .js-gallery-filter, .lightbox-btn'
    )
    if (!btn || btn === currentHoveredBtn) return
    currentHoveredBtn = btn
    scrambleElement(btn, { duration: 0.5 })
  })

  document.addEventListener('mouseout', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    const btn = target?.closest<HTMLElement>(
      '.js-section-jump, .js-gallery-filter, .lightbox-btn'
    )
    const related = e.relatedTarget as HTMLElement | null
    if (btn && !btn.contains(related) && currentHoveredBtn === btn) {
      currentHoveredBtn = null
    }
  })

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
      const newlyVisible: HTMLElement[] = []

      allItems.forEach((item) => {
        const itemCat = item.dataset.category || ''
        const shouldShow = category === 'all' || itemCat === category
        item.classList.toggle('is-hidden', !shouldShow)
        if (shouldShow) {
          newlyVisible.push(item)
        }
      })

      if (newlyVisible.length > 0) {
        gsap.fromTo(
          newlyVisible,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.04,
            ease: 'power2.out',
            overwrite: 'auto',
          }
        )
        newlyVisible.forEach((card, idx) => {
          const topSpans = card.querySelectorAll<HTMLElement>(
            '.evidence-card__top [data-scramble]'
          )
          topSpans.forEach((sp) => {
            scrambleElement(sp, { delay: idx * 0.035, duration: 0.5 })
          })
        })
      }

      getSmoothScroll()?.resize()
      requestAnimationFrame(() => {
        updateParallax()
      })
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

  // Touch swipe navigation inside the lightbox on mobile/tablet
  let touchStartX = 0
  let touchStartY = 0

  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      const lightbox = document.querySelector<HTMLElement>(
        '.js-gallery-lightbox'
      )
      if (!lightbox || !lightbox.classList.contains('is-open')) return
      const touch = e.touches[0]
      if (!touch) return
      touchStartX = touch.clientX
      touchStartY = touch.clientY
    },
    { passive: true }
  )

  document.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      const lightbox = document.querySelector<HTMLElement>(
        '.js-gallery-lightbox'
      )
      if (!lightbox || !lightbox.classList.contains('is-open')) return
      const touch = e.changedTouches[0]
      if (!touch) return
      const deltaX = touch.clientX - touchStartX
      const deltaY = touch.clientY - touchStartY
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        if (deltaX < 0) {
          updateLightboxContent(currentIndex + 1)
        } else {
          updateLightboxContent(currentIndex - 1)
        }
      }
    },
    { passive: true }
  )

  window.addEventListener('resize', () => {
    updateParallax()
  })

  mountScrollEffects()

  return {
    refresh: () => {
      mountScrollEffects()
    },
  }
}
