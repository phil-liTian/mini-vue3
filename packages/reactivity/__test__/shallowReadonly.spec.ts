import { isReactive, shallowReadonly } from "@mini-vue/reactivity";


describe('shallow readonly', () => {
  test("should not make non-reactive properties reactive", () => {
    const props = shallowReadonly({ n: { foo: 1 } });
    expect(isReactive(props.n)).toBe(false);
  });
})