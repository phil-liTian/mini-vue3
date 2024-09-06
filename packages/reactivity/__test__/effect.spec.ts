import { effect, stop } from "@mini-vue/reactivity";
import { reactive } from "@mini-vue/reactivity";


describe("effect", () => {
  it('it should be called once(wrapped by effect)', () => {
    const fnSpy = jest.fn(() => {});
    effect(fnSpy);
    expect(fnSpy).toHaveBeenCalledTimes(1);
  })

  it('should observe basic properties', () => {
    const obj = reactive({
      count: 1
    })
    let dummy;
    effect(() => {
      dummy = obj.count
    })
    expect(dummy).toBe(1)
    // 值发生改变时 effect 函数应被再次调用
    obj.count = 2
    expect(dummy).toBe(2)
  })

  it("scheduler", () => {
    let dummy;
    // let run: any;
    const scheduler = jest.fn(() => {});
    const obj = reactive({ foo: 1 });
    const run = effect(
      () => {
        dummy = obj.foo;
      },
      { scheduler }
    );
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // should be called on first trigger
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    // // should not run yet
    expect(dummy).toBe(1);
    // // manually run
    run();
    // // should have run
    expect(dummy).toBe(2);
  });

  it("stop", () => {
    let dummy;
    const obj = reactive({ prop: 1 });
    const runner = effect(() => {
      dummy = obj.prop;
    });
    obj.prop = 2;
    expect(dummy).toBe(2);
    stop(runner);
    // obj.prop = 3
    obj.prop++;
    expect(dummy).toBe(2);

    // stopped effect should still be manually callable
    runner();
    expect(dummy).toBe(3);
  });

  it("events: onStop", () => {
    const onStop = jest.fn();
    const runner = effect(() => {}, {
      onStop,
    });

    stop(runner);
    expect(onStop).toHaveBeenCalled();
  });
})