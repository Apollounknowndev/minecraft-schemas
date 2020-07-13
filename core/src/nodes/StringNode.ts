import { INode, Base } from './Node'
import { locale } from '../Registries'
import { ValidationOption } from '../ValidationOption'

type StringNodeConfig = {
  pattern?: RegExp,
  patternError?: string,
  validation?: ValidationOption
}

/**
 * Simple string node with one text field
 */
export const StringNode = (config?: StringNodeConfig): INode<string> => {
  return {
    ...Base,
    default: () => '',
    render(path, value, view, options) {
      const onChange = view.registerChange(el => {
        const value = (el as HTMLInputElement).value
        view.model.set(path, value)
      })
      return `<div class="node string-node node-header" ${path.error()}>
        ${options?.prepend ?? ''}
        <label>${options?.label ?? path.locale()}</label>
        ${options?.inject ?? ''}
        <input data-id="${onChange}" value="${value ?? ''}">
      </div>`
    },
    validate(path, value, errors) {
      if (typeof value !== 'string') {
        errors.add(path, 'error.expected_string')
        return value
      }
      if (config?.pattern && !value.match(config.pattern)) {
        errors.add(path, 'error.invalid_pattern', locale(config.patternError ?? 'pattern'))
      }
      return value
    },
    getState(el: HTMLElement) {
      return el.getElementsByTagName('input')[0].value
    },
    validationOption() {
      return config?.validation
    },
    renderRaw() {
      return `<input>`
    }
  }
}