import { Path } from './Path'
import { INode } from '../nodes/Node'
import { Errors } from './Errors'

export interface ModelListener {
  invalidated(model: DataModel): void
}

/**
 * Holding the data linked to a given schema
 */
export class DataModel {
  data: any
  schema: INode
  /** A list of listeners that want to be notified when the model is invalidated */
  listeners: ModelListener[]
  errors: Errors

  /**
   * @param schema node to use as schema for this model
   */
  constructor(schema: INode) {
    this.schema = schema
    this.data = schema.default()
    this.listeners = []
    this.errors = new Errors()
    this.validate()
  }

  /**
   * Adds a listener to notify when the model is invalidated
   * @param listener the listener to be notified
   */
  addListener(listener: ModelListener) {
    this.listeners.push(listener)
  }

  /**
   * Removes a listener from this model
   * @param listener the listener to be removed
   */
  removeListener(listener: ModelListener) {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * Force notify all listeners that the model is invalidated
   */
  invalidate() {
    this.validate()
    this.listeners.forEach(listener => listener.invalidated(this))
  }

  /**
   * Resets the full data and notifies listeners
   * @param value new model data
   */
  reset(value: any) {
    this.data = value
    this.invalidate()
  }

  /**
   * Gets the data at a specified path
   * @param path path at which to find the data
   * @returns undefined, if the the path does not exist in the data
   */
  get(path: Path) {
    let node = this.data;
    for (let index of path) {
      if (node === undefined) return node
      node = node[index]
    }
    return node
  }

  /**
   * Updates the date on a path. Node will be removed when value is undefined
   * @param path path to update
   * @param value new data at the specified path
   */
  set(path: Path, value: any) {
    console.log('Set', path.toString(), JSON.stringify(value))

    if (path.getArray().length === 0) {
      this.reset(value)
      return
    }

    let node = this.data;
    for (let index of path.pop()) {
      if (node[index] === undefined) {
        node[index] = {}
      }
      node = node[index]
    }


    if (value === undefined || (typeof value === 'number' && isNaN(value))) {
      if (typeof path.last() === 'number') {
        node.splice(path.last(), 1)
      } else {
        delete node[path.last()]
      }
    } else {
      node[path.last()] = value
    }

    this.invalidate()
  }

  /**
   * Uses the schema to check whether the data is valid
   */
  validate() {
    const path = new Path().withModel(this)
    this.errors.clear()
    this.data = this.schema.validate(path, this.data, this.errors)
  }
}
