import Tempus from 'tempus'
import '@bad-at-coding/styles/main.scss'
import { createPreloader } from './composables/preloader.js'
import { createRouter } from './composables/router.js'
import { createNavigation } from './composables/navigation.js'
import { createGrid } from './composables/grid3d.js'
import { createGrain } from './composables/grain.js'
import { createNavbar } from './composables/navbar.js'
import { initScrambleLinks } from './composables/scramble-links.js'

const initApp = () => {
  Tempus.patch()
  initScrambleLinks()
  const grid = createGrid()
  const grain = createGrain()

  createPreloader({
    onComplete: () => {
      grid.animateIn?.()
      grain.settle()
    },
  })
  const router = createRouter()
  const navbar = createNavbar()
  const navigation = createNavigation()

  router.on(
    'navigate',
    ({ url, pushState }: { url: string; pushState: boolean }) => {
      navigation.navigate(url, pushState)
    }
  )

  navigation.on('updateNavbar', ({ newNavbar }: { newNavbar: HTMLElement }) => {
    navbar.update(newNavbar)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
