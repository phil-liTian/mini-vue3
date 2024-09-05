import { extend, isObject } from "@mini-vue/shared"
import { track, trigger } from "./effect"
import { reactive, readonly, ReactiveFlags } from "./reactive"

const createGetter = (isReadonly: boolean = false, isShallow: boolean = false) => {
  return function get(target, key) {
    // 依赖收集
    if (!isReadonly) {
      track(target, key)
    }

    const res = Reflect.get(target, key)
    if ( key === ReactiveFlags.IS_REACTIVE ) {
      return !isReadonly
    } else if ( key === ReactiveFlags.IS_READONLY ) {
      return isReadonly
    }
    
    if ( isShallow ) {
      return res
    }
    
    if ( isObject(res) ){
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}

const createSetter = () => {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value)
    // 派发更新
    trigger(target, key, value)
    return res
  }
}

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

export const mutableHandlers = {
  get,
  set,
}

export const readonlyHandlers = {
  get: readonlyGet,
  set: (target, key, value) => {
    console.warn(`${String(key)} is readonly, not allowed to set`)
    return true
  }
}

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, { get: shallowReadonlyGet })

