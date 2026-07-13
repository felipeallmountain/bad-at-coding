import { createEventEmitter, IEventEmitter } from './event-emitter.js'

export interface IComponentClasses {
  [key: string]: string
}

export interface IComponentElements {
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

export interface IComponent extends IEventEmitter {
  element?: HTMLElement
  elements: IComponentElements
  classes: IComponentClasses
  destroy: () => void
}

export function createComponent({
  classes,
  element: selector,
}: {
  classes: IComponentClasses
  element: TComponentSelector
}): IComponent {
  const eventEmitter = createEventEmitter()

  let element: HTMLElement | undefined
  if (selector instanceof HTMLElement) {
    element = selector
  } else {
    element = (document.querySelector(selector) as HTMLElement) || undefined
  }

  const elements: IComponentElements = {}
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
