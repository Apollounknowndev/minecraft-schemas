import { AbstractNode, NodeMods, RenderOptions, StateNode } from './AbstractNode'
import { Path } from '../model/Path'
import { DataModel } from '../model/DataModel'
import { TreeView } from '../view/TreeView'
import { locale } from '../Registries'

export interface NumberNodeMods extends NodeMods<number> {
  /** Whether numbers should be converted to integers on input */
  integer?: boolean
  /** If specified, number will be capped at this minimum */
  min?: number
  /** If specified, number will be capped at this maximum */
  max?: number
}

/**
 * Configurable number node with one text field
 */
export class NumberNode extends AbstractNode<number> implements StateNode<number> {
  integer: boolean
  min: number
  max: number

  /**
   * @param mods optional node modifiers
   */
  constructor(mods?: NumberNodeMods) {
    super({
      default: () => 0,
      ...mods})
    this.integer = mods?.integer ?? false
    this.min = mods?.min ?? -Infinity
    this.max = mods?.max ?? Infinity
  }

  getState(el: Element) {
    const value = el.querySelector('input')!.value
    const parsed = this.integer ? parseInt(value) : parseFloat(value)
    if (parsed < this.min) return this.min
    if (parsed > this.max) return this.max
    return parsed
  }

  updateModel(el: Element, path: Path, model: DataModel) {
    model.set(path, this.getState(el))
  }

  renderRaw(path: Path, value: number, view: TreeView, options?: RenderOptions) {
    return `${options?.hideLabel ? `` : `<label>${locale(path)}</label>`}
      <input value="${value ?? ''}">`
  }

  getClassName() {
    return 'number-node'
  }
}
