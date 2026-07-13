// @ts-expect-error: path alias import for SCSS file stylesheet
import '@bad-at-coding/styles/main.scss'
import { createPreloader } from './composables/preloader.js'
import { createRouter } from './composables/router.js'
import { createNavigation } from './composables/navigation.js'

function initApp() {
  const preloader = createPreloader()
  const router = createRouter()
  const navigation = createNavigation()

  router.on(
    'navigate',
    ({ url, pushState }: { url: string; pushState: boolean }) => {
      navigation.navigate(url, pushState)
    }
  )

  return {
    preloader,
    router,
    navigation,
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
