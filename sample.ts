import { type IC, createInnerClass } from "./util";
import { Predicate } from "./Predicate";
import { Variable } from "./Variable";
import { VM } from "./VM";
import { For } from "./For";

export class PointInQuarterCircle implements Predicate {
  private R: Variable;
  private X: Variable;
  private Y: Variable;
  private cont: Predicate;

  public constructor(R: Variable, X: Variable, Y: Variable, cont: Predicate) {
    this.R = R;
    this.X = X;
    this.Y = Y;
    this.cont = cont;
  }

  public exec(vm: VM): Predicate {
    return new this.Method_1().exec(vm);
  }

  public Method_1: IC = createInnerClass(this).with(
    (outerThis) =>
      class implements Predicate {
        private D: Variable = new Variable();

        public exec(vm: VM): Predicate {
          return this.method_1_cu1.exec(vm);
        }

        public Method_1_cu1: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                return new For(
                  outerThis.X,
                  0.0,
                  outerThis.R,
                  1.0,
                  methodThis.method_1_cu2
                );
              }
            }
        );

        public Method_1_cu2: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                return new For(
                  outerThis.Y,
                  0.0,
                  outerThis.R,
                  1.0,
                  methodThis.method_1_cu3
                );
              }
            }
        );

        public Method_1_cu3: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                methodThis.D.setValue(
                  Math.sqrt(
                    outerThis.X.getNumberValue() ** 2 +
                      outerThis.Y.getNumberValue() ** 2
                  )
                );
                if (
                  !(
                    methodThis.D.getNumberValue() <=
                    outerThis.R.getNumberValue()
                  )
                ) {
                  return Predicate.failure;
                }
                return outerThis.cont;
              }
            }
        );

        private method_1_cu1 = new this.Method_1_cu1();
        private method_1_cu2 = new this.Method_1_cu2();
        private method_1_cu3 = new this.Method_1_cu3();
      }
  );
}

export const main = (input: number) => {
  const vm: VM = new VM();

  const r: Variable = new Variable(input);
  const x: Variable = new Variable(0);
  const y: Variable = new Variable(0);

  const p: Predicate = new PointInQuarterCircle(r, x, y, Predicate.success);

  const result: {
    x: number;
    y: number;
  }[] = [];

  for (let s: boolean = vm.call(p); s === true; s = vm.redo()) {
    result.push({ x: x.getNumberValue(), y: y.getNumberValue() });
  }

  return result;
};

// export const result = main();
