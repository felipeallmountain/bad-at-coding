import { createComponent, TComponent, TComponentClasses } from './component.js'

export type TPage = TComponent & {
  create: () => void
  show: () => void
  hide: () => void
  update: () => void
}

export const createPage = ({
  classes,
  element,
}: {
  classes: TComponentClasses
  element: HTMLElement
}): TPage => {
  const component = createComponent({ classes, element })

  const create = () => { }
  const show = () => { }
  const hide = () => { }
  const update = () => { }

  return {
    ...component,
    create,
    show,
    hide,
    update,
  }
}
