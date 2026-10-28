import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'
import { getSmoothScroll } from './smooth-scroll.js'

gsap.registerPlugin(Flip, ScrambleTextPlugin)

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

      const media =
        img.closest<HTMLElement>('.evidence-card__media') ?? img.parentElement
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

    // Clean up any previously portaled lightbox on document.body before mounting
    document
      .querySelectorAll<HTMLElement>('body > .js-gallery-lightbox')
      .forEach((el) => el.remove())

    const wrapper = document.querySelector<HTMLElement>(
      '.v-feed-06 .container__content'
    )
    if (!wrapper) return

    // Portal lightbox to document.body so position: fixed is never trapped
    // inside a transformed or scrolling ancestor container on mobile
    const inlineLightbox = wrapper.querySelector<HTMLElement>(
      '.js-gallery-lightbox'
    )
    if (inlineLightbox) {
      document.body.appendChild(inlineLightbox)
    }

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
        threshold: 0.01,
        rootMargin: '0px 0px -2% 0px',
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
        threshold: 0.01,
        rootMargin: '0px 0px -2% 0px',
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
  let transitionToken = 0
  let isClosingLightbox = false
  let loaderTimeout: ReturnType<typeof setTimeout> | null = null
  const preloadedSources = new Set<string>()

  const preloadLightboxItem = (item: HTMLElement | undefined) => {
    if (!item) return
    const src = item.dataset.src || item.dataset.fallback || ''
    if (!src || preloadedSources.has(src)) return
    preloadedSources.add(src)

    const img = new Image()
    img.decoding = 'async'
    if (item.dataset.sizes) {
      img.sizes = item.dataset.sizes
    }
    if (item.dataset.srcset) {
      img.srcset = item.dataset.srcset
    }
    img.src = src
    img.decode?.().catch(() => {})
  }

  const preloadAdjacentItems = (index: number, items: HTMLElement[]) => {
    if (items.length <= 1) return
    const prevIdx = (((index - 1) % items.length) + items.length) % items.length
    const nextIdx = (index + 1) % items.length
    preloadLightboxItem(items[prevIdx])
    preloadLightboxItem(items[nextIdx])
  }

  const createSlidePicture = (
    item: HTMLElement
  ): {
    pictureEl: HTMLPictureElement
    imgEl: HTMLImageElement
  } => {
    const src = item.dataset.src || ''
    const srcset = item.dataset.srcset || ''
    const sizes = item.dataset.sizes || '(max-width: 768px) 96vw, 90vw'
    const fallback = item.dataset.fallback || src
    const title = item.dataset.title || 'Evidence inspection preview'

    const pictureEl = document.createElement('picture')
    pictureEl.className = 'gallery-lightbox__picture js-lightbox-slide'

    const sourceEl = document.createElement('source')
    sourceEl.className = 'js-lightbox-source'
    sourceEl.type = 'image/webp'
    sourceEl.srcset = srcset
    sourceEl.sizes = sizes

    const imgEl = document.createElement('img')
    imgEl.className = 'gallery-lightbox__img js-lightbox-img'
    imgEl.src = src || fallback
    imgEl.alt = title
    imgEl.decoding = 'async'
    imgEl.draggable = false

    pictureEl.append(sourceEl, imgEl)
    return { pictureEl, imgEl }
  }

  const updateLightboxContent = (index: number, direction = 0) => {
    const items = getGalleryItems()
    if (items.length === 0) return

    const normalizedIndex =
      ((index % items.length) + items.length) % items.length
    currentIndex = normalizedIndex

    const item = items[normalizedIndex]
    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    if (!lightbox || !item) return

    const title = item.dataset.title || ''
    const caption = item.dataset.caption || ''
    const photoId = item.dataset.id || ''
    const aspect = item.dataset.aspect || ''
    const file = item.dataset.file || ''

    const slidesContainer = lightbox.querySelector<HTMLElement>(
      '.js-lightbox-slides'
    )
    const loaderEl = lightbox.querySelector<HTMLElement>('.js-lightbox-loader')
    const idEl = lightbox.querySelector<HTMLElement>('.js-lightbox-id')
    const titleEl = lightbox.querySelector<HTMLElement>('.js-lightbox-title')
    const captionEl = lightbox.querySelector<HTMLElement>(
      '.js-lightbox-caption'
    )
    const metaEl = lightbox.querySelector<HTMLElement>('.js-lightbox-meta')

    preloadAdjacentItems(normalizedIndex, items)

    if (idEl) {
      const idText = `[ ${photoId.toUpperCase()} // ${String(normalizedIndex + 1).padStart(2, '0')} OF ${String(items.length).padStart(2, '0')} ]`
      idEl.dataset.originalText = idText
      idEl.textContent = idText
      scrambleElement(idEl, { duration: 0.5 })
    }
    if (titleEl) {
      titleEl.dataset.originalText = title
      titleEl.textContent = title
      scrambleElement(titleEl, { duration: 0.6 })
    }
    if (captionEl) {
      captionEl.textContent = caption
      gsap.fromTo(
        captionEl,
        { opacity: 0, x: direction * 10, y: direction === 0 ? 6 : 0 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto',
        }
      )
    }
    if (metaEl) {
      metaEl.textContent = `${aspect} · ${file}`
      if (direction !== 0) {
        gsap.fromTo(
          metaEl,
          { opacity: 0.35, x: direction * 6 },
          {
            opacity: 1,
            x: 0,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: 'auto',
          }
        )
      }
    }

    if (!slidesContainer) return

    const token = ++transitionToken
    if (loaderTimeout) {
      clearTimeout(loaderTimeout)
      loaderTimeout = null
    }

    // Initial open (direction === 0): replace slides cleanly and animate in
    if (direction === 0) {
      loaderEl?.classList.remove('is-visible')
      const { pictureEl, imgEl } = createSlidePicture(item)
      slidesContainer.replaceChildren(pictureEl)
      gsap.set(pictureEl, { opacity: 0, scale: 0.965, x: 0 })

      const revealInitial = () => {
        if (token !== transitionToken) return
        gsap.fromTo(
          pictureEl,
          {
            opacity: 0,
            scale: 0.965,
            filter: 'brightness(1.25) contrast(1.1)',
          },
          {
            opacity: 1,
            scale: 1,
            x: 0,
            filter: 'brightness(1) contrast(1)',
            duration: 0.38,
            ease: 'power3.out',
          }
        )
      }

      if (imgEl.decode) {
        Promise.race([
          imgEl.decode().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 160)),
        ]).then(revealInitial)
      } else {
        revealInitial()
      }
      return
    }

    // Directional navigation (+1 next / -1 prev): dual-layer crossfade + slide
    const existingSlides = Array.from(
      slidesContainer.querySelectorAll<HTMLElement>('.js-lightbox-slide')
    )
    // If more than 1 old slide is lingering from rapid clicks, prune all but the most recent
    if (existingSlides.length > 1) {
      existingSlides.slice(0, -1).forEach((oldSlide) => {
        gsap.killTweensOf(oldSlide)
        oldSlide.remove()
      })
    }

    const outgoingSlide = slidesContainer.querySelector<HTMLElement>(
      '.js-lightbox-slide:last-of-type'
    )

    const { pictureEl: incomingSlide, imgEl: incomingImg } =
      createSlidePicture(item)
    gsap.set(incomingSlide, { opacity: 0 })
    slidesContainer.appendChild(incomingSlide)

    loaderTimeout = setTimeout(() => {
      if (token === transitionToken) {
        loaderEl?.classList.add('is-visible')
      }
    }, 90)

    const runDirectionalTransition = () => {
      if (loaderTimeout) {
        clearTimeout(loaderTimeout)
        loaderTimeout = null
      }
      loaderEl?.classList.remove('is-visible')

      if (token !== transitionToken) {
        incomingSlide.remove()
        return
      }

      const stageWidth = slidesContainer.clientWidth || 360
      const slideOffsetPx = Math.round(
        Math.min(96, Math.max(36, stageWidth * 0.12))
      )

      if (outgoingSlide && outgoingSlide !== incomingSlide) {
        gsap.killTweensOf(outgoingSlide)
        gsap.to(outgoingSlide, {
          x: -direction * slideOffsetPx,
          scale: 0.955,
          opacity: 0,
          filter: 'brightness(0.6) contrast(1.15)',
          duration: 0.38,
          ease: 'power3.out',
          overwrite: 'auto',
          onComplete: () => {
            outgoingSlide.remove()
          },
        })
      }

      gsap.fromTo(
        incomingSlide,
        {
          x: direction * slideOffsetPx,
          scale: 1.025,
          opacity: 0,
          filter: 'brightness(1.3) contrast(1.14)',
        },
        {
          x: 0,
          scale: 1,
          opacity: 1,
          filter: 'brightness(1) contrast(1)',
          duration: 0.42,
          ease: 'power3.out',
          overwrite: 'auto',
        }
      )
    }

    if (incomingImg.decode) {
      Promise.race([
        incomingImg.decode().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 220)),
      ]).then(runDirectionalTransition)
    } else {
      runDirectionalTransition()
    }
  }

  const openLightbox = (index: number) => {
    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    if (!lightbox) return

    isClosingLightbox = false
    gsap.killTweensOf(lightbox)
    lightbox.classList.add('is-open')
    lightbox.setAttribute('aria-hidden', 'false')

    gsap.fromTo(
      lightbox,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: 'power2.out' }
    )

    const dialog = lightbox.querySelector<HTMLElement>(
      '.gallery-lightbox__dialog'
    )
    if (dialog) {
      gsap.killTweensOf(dialog)
      gsap.fromTo(
        dialog,
        { opacity: 0, y: 16, scale: 0.975 },
        { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power3.out' }
      )
    }
    updateLightboxContent(index, 0)
  }

  const closeLightbox = () => {
    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    if (
      !lightbox ||
      !lightbox.classList.contains('is-open') ||
      isClosingLightbox
    ) {
      return
    }

    isClosingLightbox = true
    const dialog = lightbox.querySelector<HTMLElement>(
      '.gallery-lightbox__dialog'
    )

    if (dialog) {
      gsap.to(dialog, {
        opacity: 0,
        y: 12,
        scale: 0.98,
        duration: 0.2,
        ease: 'power2.in',
        overwrite: 'auto',
      })
    }

    gsap.to(lightbox, {
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: () => {
        lightbox.classList.remove('is-open')
        lightbox.setAttribute('aria-hidden', 'true')
        gsap.set(lightbox, { clearProps: 'opacity' })
        if (dialog) {
          gsap.set(dialog, { clearProps: 'opacity,transform,translate,scale' })
        }
        isClosingLightbox = false
      },
    })
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

    // 2. Gallery category filter buttons with GSAP Flip layout transitions
    const filterBtn = target.closest<HTMLElement>('.js-gallery-filter')
    if (filterBtn) {
      e.preventDefault()
      if (filterBtn.classList.contains('is-active')) return

      const category = filterBtn.dataset.filter || 'all'
      const allFilters =
        document.querySelectorAll<HTMLElement>('.js-gallery-filter')
      allFilters.forEach((btn) => {
        btn.classList.toggle('is-active', btn === filterBtn)
      })

      const allItems = Array.from(
        document.querySelectorAll<HTMLElement>('.js-gallery-item')
      )
      const flipState = Flip.getState(allItems)
      const newlyVisible: HTMLElement[] = []

      allItems.forEach((item) => {
        const wasHidden = item.classList.contains('is-hidden')
        const itemCat = item.dataset.category || ''
        const shouldShow = category === 'all' || itemCat === category
        item.classList.toggle('is-hidden', !shouldShow)
        if (shouldShow && wasHidden) {
          newlyVisible.push(item)
        }
      })

      Flip.from(flipState, {
        duration: 0.45,
        ease: 'power3.out',
        scale: false,
        absoluteOnLeave: true,
        onEnter: (elements) =>
          gsap.fromTo(
            elements,
            { opacity: 0, scale: 0.95, y: 16 },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.4,
              stagger: 0.035,
              ease: 'power3.out',
              clearProps: 'scale',
            }
          ),
        onLeave: (elements) =>
          gsap.to(elements, {
            opacity: 0,
            scale: 0.95,
            duration: 0.24,
            ease: 'power2.in',
            clearProps: 'scale',
          }),
        onComplete: () => {
          getSmoothScroll()?.resize()
          updateParallax()
        },
      })

      newlyVisible.forEach((card, idx) => {
        const topSpans = card.querySelectorAll<HTMLElement>(
          '.evidence-card__top [data-scramble]'
        )
        topSpans.forEach((sp) => {
          scrambleElement(sp, { delay: idx * 0.035, duration: 0.5 })
        })
      })

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
      updateLightboxContent(currentIndex - 1, -1)
      return
    }

    if (target.closest('.js-lightbox-next')) {
      e.preventDefault()
      updateLightboxContent(currentIndex + 1, 1)
      return
    }

    // Close when clicking backdrop directly
    if (target.classList.contains('js-gallery-lightbox')) {
      closeLightbox()
    }
  })

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    if (lightbox && lightbox.classList.contains('is-open')) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeLightbox()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        updateLightboxContent(currentIndex - 1, -1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        updateLightboxContent(currentIndex + 1, 1)
      }
      return
    }

    // Allow keyboard activation (Enter / Space) on focused gallery cards
    if (e.key === 'Enter' || e.key === ' ') {
      const activeEl = document.activeElement as HTMLElement | null
      const galleryItem = activeEl?.closest<HTMLElement>('.js-gallery-item')
      if (galleryItem) {
        e.preventDefault()
        const visibleItems = getGalleryItems()
        const idx = visibleItems.indexOf(galleryItem)
        openLightbox(idx >= 0 ? idx : 0)
      }
    }
  })

  // Interactive touch-drag & swipe navigation inside the lightbox on mobile/tablet
  let touchStartX = 0
  let touchStartY = 0
  let touchDeltaX = 0
  let isDraggingStage = false
  let touchAxisLocked: 'x' | 'y' | null = null

  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      const lightbox = document.querySelector<HTMLElement>(
        '.js-gallery-lightbox'
      )
      if (!lightbox || !lightbox.classList.contains('is-open')) return
      const target = e.target as HTMLElement | null
      if (!target?.closest('.js-lightbox-stage')) return
      if (e.touches.length !== 1) return

      const touch = e.touches[0]
      if (!touch) return
      touchStartX = touch.clientX
      touchStartY = touch.clientY
      touchDeltaX = 0
      isDraggingStage = false
      touchAxisLocked = null
    },
    { passive: true }
  )

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      const lightbox = document.querySelector<HTMLElement>(
        '.js-gallery-lightbox'
      )
      if (!lightbox || !lightbox.classList.contains('is-open')) return
      if (e.touches.length !== 1) return
      const target = e.target as HTMLElement | null
      if (!target?.closest('.js-lightbox-stage')) return

      const touch = e.touches[0]
      if (!touch) return
      const deltaX = touch.clientX - touchStartX
      const deltaY = touch.clientY - touchStartY

      if (!touchAxisLocked) {
        if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return
        touchAxisLocked = Math.abs(deltaX) >= Math.abs(deltaY) ? 'x' : 'y'
      }

      if (touchAxisLocked !== 'x') return

      isDraggingStage = true
      touchDeltaX = deltaX

      const activeSlide = lightbox.querySelector<HTMLElement>(
        '.js-lightbox-slides .js-lightbox-slide:last-of-type'
      )
      if (activeSlide) {
        const dragProgress = Math.min(1, Math.abs(deltaX) / 260)
        gsap.set(activeSlide, {
          x: deltaX * 0.82,
          scale: 1 - dragProgress * 0.04,
          opacity: 1 - dragProgress * 0.32,
        })
      }
    },
    { passive: true }
  )

  const finishTouchSwipe = () => {
    if (!isDraggingStage) {
      touchAxisLocked = null
      return
    }

    const lightbox = document.querySelector<HTMLElement>('.js-gallery-lightbox')
    const deltaX = touchDeltaX
    isDraggingStage = false
    touchDeltaX = 0
    touchAxisLocked = null

    if (!lightbox || !lightbox.classList.contains('is-open')) return

    if (Math.abs(deltaX) > 42) {
      const direction = deltaX < 0 ? 1 : -1
      updateLightboxContent(currentIndex + direction, direction)
    } else {
      const activeSlide = lightbox.querySelector<HTMLElement>(
        '.js-lightbox-slides .js-lightbox-slide:last-of-type'
      )
      if (activeSlide) {
        gsap.to(activeSlide, {
          x: 0,
          scale: 1,
          opacity: 1,
          duration: 0.28,
          ease: 'power3.out',
          overwrite: 'auto',
        })
      }
    }
  }

  document.addEventListener('touchend', finishTouchSwipe, { passive: true })
  document.addEventListener('touchcancel', finishTouchSwipe, { passive: true })

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
