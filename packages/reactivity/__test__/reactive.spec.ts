import { isReactive, reactive } from '@mini-vue/reactivity'
describe('Reactive', () => {
  it('happy path', () => {
    const original = { foo: 1 }
    const newOriginal = reactive(original)
    expect(original).not.toBe(newOriginal)
    expect(newOriginal.foo).toBe(1)

    expect(isReactive(newOriginal)).toBe(true)
    expect(isReactive(original)).toBe(false)
  })


  it('Nested reactives', () => {
    const original = {
      nested: {
        foo: 1
      },
      array: [{ bar: 2 }]
    }
    const observed = reactive(original);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.array)).toBe(true);
    expect(isReactive(observed.array[0])).toBe(true);
  })
})
