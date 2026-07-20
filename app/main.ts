import Tempus from 'tempus'
// @ts-expect-error: path alias import for SCSS file stylesheet
import '@bad-at-coding/styles/main.scss'
import { createPreloader } from './composables/preloader.js'
import { createRouter } from './composables/router.js'
import { createNavigation } from './composables/navigation.js'
import { createGrid } from './composables/grid3d.js'

const initApp = () => {
  Tempus.patch()
  createGrid()
  createPreloader()
  const router = createRouter()
  const navigation = createNavigation()
  // const currentPage = L

  router.on(
    'navigate',
    ({ url, pushState }: { url: string; pushState: boolean }) => {
      navigation.navigate(url, pushState)
    }
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
