import { DataModel, ModelListener } from '../model/DataModel'
import { Path } from '../model/Path'

type Registry = {
  [id: string]: (el: Element) => void
}

const registryIdLength = 12
const dec2hex = (dec: number) => ('0' + dec.toString(16)).substr(-2)

/**
 * Helper function to generate a random ID
 */
export function getId() {
  var arr = new Uint8Array((registryIdLength || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, dec2hex).join('')
}

type TreeViewOptions = {
  showErrors?: boolean
  observer?: (el: HTMLElement) => void
}

/**
 * DOM representation view of the model.
 */
export class TreeView implements ModelListener {
  model: DataModel
  target: HTMLElement
  registry: Registry = {}
  showErrors: boolean
  observer: (el: HTMLElement) => void

  /**
   * @param model data model this view represents and listens to
   * @param target DOM element to render the view
   */
  constructor(model: DataModel, target: HTMLElement, options?: TreeViewOptions) {
    this.model = model
    this.target = target
    this.model.addListener(this)
    this.showErrors = options?.showErrors ?? false
    this.observer = options?.observer ?? (() => {})
  }

  /**
   * Registers a callback and gives an ID
   * @param callback function that is called when the element is mounted
   * @returns the ID that should be applied to the data-id attribute
   */
  register(callback: (el: Element) => void): string {
    const id = getId()
    this.registry[id] = callback
    return id
  }

  /**
   * Registers an event and gives an ID
   * @param type event type
   * @param callback function that is called when the event is fired
   * @returns the ID that should be applied to the data-id attribute
   */
  registerEvent(type: string, callback: (el: Element) => void): string {
    return this.register(el => {
      el.addEventListener(type, evt => {
        callback(el)
        evt.stopPropagation()
      })
    })
  }

  /**
   * Registers a change event and gives an ID
   * @param callback function that is called when the event is fired
   * @returns the ID that should be applied to the data-id attribute
   */
  registerChange(callback: (el: Element) => void): string {
    return this.registerEvent('change', callback)
  }

  /**
   * Registers a click event and gives an ID
   * @param callback function that is called when the event is fired
   * @returns the ID that should be applied to the data-id attribute
   */
  registerClick(callback: (el: Element) => void): string {
    return this.registerEvent('click', callback)
  }

  /**
   * @override
   */
  invalidated() {
    this.target.innerHTML = this.model.schema.render(
      new Path().withModel(this.model), this.model.data, this, {hideHeader: true})
    for (const id in this.registry) {
      const element = this.target.querySelector(`[data-id="${id}"]`)
      if (element !== null) this.registry[id](element)
    }
    this.registry = {}
    this.observer(this.target)
  }
}
