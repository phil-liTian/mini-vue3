import { ReactiveEffect } from "./effect"
import { trackRefValue, triggerRefValue } from "./ref";

class ComputedRefImpl {
  private _getter: any
  effect: ReactiveEffect
  private _value: any;
  private _dirty: boolean = true;
  deps: any;
  constructor(getter) {
    this.deps = new Set()
    this.effect = new ReactiveEffect(getter, () => {
      if ( this._dirty ) return
      this._dirty = true

      triggerRefValue(this.deps)
    })
  }

  get value()  {
    if ( this._dirty ) {
      this._dirty = false
      this._value = this.effect.run()
    }

    return this._value
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter)
}
