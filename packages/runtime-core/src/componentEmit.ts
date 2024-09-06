import { toHandleKey } from "@mini-vue/shared"

export function emit(instance, event, ...args) {
  const props = instance.props
  // event add => onAdd
  // event add-demo => onAddDemo
  
  // 添加on
  const handler = props[toHandleKey(event)]

  if ( handler ) {
    handler()
  }

}