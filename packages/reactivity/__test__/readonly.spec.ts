import { isReadonly, readonly } from "@mini-vue/reactivity"

describe('readonly', () => {
  it('happy path', () => {
    const original = { foo: 1 }
    const wrapped = readonly(original)
    expect(wrapped).not.toBe(original)
    expect(wrapped.foo).toBe(1)

    console.warn = jest.fn()
    wrapped.foo = 2
    expect(console.warn).toBeCalledTimes(1)
    expect(isReadonly(wrapped)).toBe(true)
    expect(isReadonly(original)).toBe(false)
  })

  it('nested readonly', () => {
    const original = { foo: { bar: 1 } }
    expect(isReadonly(readonly(original))).toBe(true)
    expect(isReadonly(readonly(original).foo)).toBe(true)
    expect(isReadonly(original)).toBe(false)
  })
})