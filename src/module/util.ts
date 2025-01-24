import type { VM } from "./VM";
import type { Predicate } from "./Predicate";

/**
 * 内部クラスを作成する関数
 * @param value 外部クラスのthis
 * @returns 内部クラス
 */
export function createInnerClass<T>(value: T) {
  return new (class {
    with<U>(f: (value: T) => U) {
      return f(value);
    }
  })();
}

/**
 * 内部クラスの返り値の型
 * InnerClassType
 */
export type IC = { new (): { exec(vm: VM): Predicate } };
