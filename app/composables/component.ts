import { createEventEmitter, TEventEmitter } from './event-emitter.js'

export type TComponentClasses = {
  [key: string]: string
}

export type TComponentElements = {
  [key: string]:
    | unknown[]
    | Element
    | Array<Element>
    | HTMLElement
    | Array<HTMLElement>
    | NodeList
    | Window
    | null
}

export type TComponentSelector = string | HTMLElement

export type TComponent = TEventEmitter & {
  element?: HTMLElement
  elements: TComponentElements
  classes: TComponentClasses
  destroy: () => void
}

export const createComponent = ({
  classes,
  element: selector,
}: {
  classes: TComponentClasses
  element: TComponentSelector
}): TComponent => {
  const eventEmitter = createEventEmitter()

  let element: HTMLElement | undefined
  if (selector instanceof HTMLElement) {
    element = selector
  } else {
    element = (document.querySelector(selector) as HTMLElement) || undefined
  }

  const elements: TComponentElements = {}
  if (element) {
    for (const key in classes) {
      const classSelector = classes[key]
      const domElements = element.querySelectorAll(classSelector)
      elements[key] = domElements.length === 1 ? domElements[0] : domElements
    }
  }

  const destroy = () => {
    eventEmitter.destroy()
    element = undefined
    for (const key in elements) {
      delete elements[key]
    }
  }

  return {
    ...eventEmitter,
    element,
    elements,
    classes,
    destroy,
  }
}
