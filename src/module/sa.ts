import Decimal from "decimal.js";
import { type IC, createInnerClass } from "./util";
import { Predicate } from "./Predicate";
import { Variable } from "./Variable";
import { List } from "./List";
import { VObject } from "./Object";
import { VM } from "./VM";
import { For } from "./For";
import { Member } from "./Member";

export class SampleClass implements Predicate {
  private R: Variable<number>;
  private X: VObject<{ 1: number; 2: number }>;
  private cont: Predicate;

  public constructor(
    R: Variable<number>,
    X: VObject<{ 1: number; 2: number }>,
    cont: Predicate
  ) {
    this.R = R;
    this.X = X;
    this.cont = cont;
  }

  public exec(vm: VM): Predicate {
    return new this.Method_1().exec(vm);
  }

  public Method_1: IC = createInnerClass(this).with(
    (outerThis) =>
      class implements Predicate {
        public exec(vm: VM): Predicate {
          return this.method_1_cu1.exec(vm);
        }

        public Method_1_cu1: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                outerThis.X.setValue({
                  1: outerThis.R.getValue(),
                  2: outerThis.R.getValue(),
                });
                return outerThis.cont;
              }
            }
        );

        private method_1_cu1 = new this.Method_1_cu1();
      }
  );
}

export const main = (input: { _R: number }) => {
  const vm: VM = new VM();
  const _R: Variable<number> = new Variable<number>(input._R);
  const _X: VObject<{ 1: number; 2: number }> = new VObject<{
    1: number;
    2: number;
  }>({ 1: 0, 2: 0 });
  const p: Predicate = new SampleClass(_R, _X, Predicate.success);

  const result: {
    X: object;
  }[] = [];

  for (let s: boolean = vm.call(p); s === true; s = vm.redo()) {
    result.push({
      X: _X.getValue(),
    });
  }

  return result;
};
