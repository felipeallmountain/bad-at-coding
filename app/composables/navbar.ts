export type TNavbar = {
  update: (newNavbar: HTMLElement) => void
}

export const NAVBAR_ELEMENT = '.nav__content'

export const createNavbar = (): TNavbar => {
  const navbarElement = document.querySelector(NAVBAR_ELEMENT)


  const update = (newNavbar: HTMLElement) => {
    console.log(newNavbar)

  }

  return {
    update
  }
}
