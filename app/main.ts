// @ts-expect-error: path alias import for SCSS file stylesheet
import '@bad-at-coding/styles/main.scss'
import { Preloader } from './classes/preloader.js'
import { Router } from './classes/router.js'
import { Navigation } from './classes/navigation.js'


class App {
  router: Router
  preloader: Preloader
  navigation: Navigation

  constructor() {
    this.preloader = new Preloader()
    this.router = new Router()
    this.navigation = new Navigation()
    this.router.on(
      'navigate',
      ({ url, pushState }: { url: string; pushState: boolean }) => {
        this.navigation.navigate(url, pushState)
      }
    )
  }
}

new App()
