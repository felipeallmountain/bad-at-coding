import { createComponent, IComponent, IComponentClasses } from './component.js'

export interface IPage extends IComponent {
  create: () => void
  show: () => void
  hide: () => void
  update: () => void
}

export function createPage({
  classes,
  element,
}: {
  classes: IComponentClasses
  element: HTMLElement
}): IPage {
  const component = createComponent({ classes, element })

  const create = () => {}
  const show = () => {}
  const hide = () => {}
  const update = () => {}

  return {
    ...component,
    create,
    show,
    hide,
    update,
  }
}
