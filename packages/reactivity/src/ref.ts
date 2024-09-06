import { hasChanged, isObject } from "@mini-vue/shared";
import { trackEffects, triggerEffects } from "./effect"
import { reactive } from "./reactive";

class RefImpl {
  private _value: any
  public deps;
  private _rawValue: any;
  public __v_isRef = true;
  constructor(value) {
    this._rawValue = value
    this._value = convert(value)
    this.deps = new Set()
  }

  get value() {
    // 收集依赖
    trackRefValue(this.deps)
    return this._value
  }

  set value(newValue) {
    if ( !hasChanged(this._rawValue, newValue) ) return
    this._rawValue = newValue

    this._value = convert(newValue)

    triggerEffects(this.deps)
  }
}


export function ref(value) {
  return new RefImpl(value)
}

export function isRef(value) {
  return !!(value && value.__v_isRef)
}

export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}

export function proxyRefs(value) {
  return new Proxy(value, {
    get(target, key) {

      return unRef(Reflect.get(target, key))
    },
    set(target, key, value) {
      const oldValue = target[key]

      if ( isRef(oldValue) && !isRef(value) ) {
        return target[key].value = value
      } 
      
      return Reflect.set(target, key, value)
    }
  })
}

export function triggerRefValue(dep) {
  triggerEffects(dep)
}

export function trackRefValue(dep) {
  trackEffects(dep)
}

function convert(value) {
  return isObject(value) ? reactive(value) : value
}
