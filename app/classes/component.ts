import autoBind from 'auto-bind'
import { EventEmitter } from './event-emitter.js'

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

export class Component extends EventEmitter {
  classes: IComponentClasses
  element?: HTMLElement
  elements: IComponentElements = {}

  constructor({
    classes,
    element,
  }: {
    classes: IComponentClasses
    element: TComponentSelector
  }) {
    super()

    autoBind(this)
    this.classes = classes
    this.initElement(element)
    this.initElements(classes)
    this.addEventListeners()
  }

  initElement(selector: TComponentSelector) {
    if (selector instanceof HTMLElement) {
      this.element = selector
      return
    }

    this.element = document.querySelector(selector)!
  }

  destroyElement() {
    this.element = undefined
  }

  initElements(selectors: IComponentClasses) {
    for (const key in selectors) {
      const selector = selectors[key]
      const elements = this.element!.querySelectorAll(selector)

      this.elements[key] = elements.length === 1 ? elements[0] : elements
    }
  }

  destroyElements() {
    this.elements = {}
  }

  addEventListeners() { }

  removeEventListeners() { }

  destroy() {
    super.destroy()

    this.removeEventListeners()
    this.destroyElement()
    this.destroyElements()
  }
}
