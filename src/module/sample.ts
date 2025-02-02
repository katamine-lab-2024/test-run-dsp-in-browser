import { type IC, createInnerClass } from "./util";
import { Predicate } from "./Predicate";
import { Variable } from "./Variable";
import { List } from "./List";
import { VM } from "./VM";
import { For } from "./For";
import { Member } from "./Member";

export class ForClass implements Predicate {
  private B: Variable<number>;
  private E: Variable<number>;
  private S: Variable<number>;
  private N: Variable<number>;
  private cont: Predicate;

  public constructor(
    B: Variable<number>,
    E: Variable<number>,
    S: Variable<number>,
    N: Variable<number>,
    cont: Predicate
  ) {
    this.B = B;
    this.E = E;
    this.S = S;
    this.N = N;
    this.cont = cont;
  }

  public exec(vm: VM): Predicate {
    const method_2 = new this.Method_2();
    const method_1 = new this.Method_1();

    if (
      !(this.B.getValue() + this.S.getValue() <= this.E.getValue()) &&
      !(this.B.getValue() <= this.E.getValue())
    ) {
      return Predicate.failure;
    }

    if (
      this.B.getValue() + this.S.getValue() <= this.E.getValue() &&
      this.B.getValue() <= this.E.getValue()
    ) {
      vm.setChoicePoint(method_2);
      return method_1.exec(vm);
    }

    if (this.B.getValue() + this.S.getValue() <= this.E.getValue()) {
      return method_2.exec(vm);
    }
    if (this.B.getValue() <= this.E.getValue()) {
      return method_1.exec(vm);
    }
    return Predicate.failure;
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
                outerThis.N.setValue(outerThis.B.getValue());
                console.log("N: ", outerThis.N.getValue());
                return outerThis.cont;
              }
            }
        );

        private method_1_cu1 = new this.Method_1_cu1();
      }
  );

  public Method_2: IC = createInnerClass(this).with(
    (outerThis) =>
      class implements Predicate {
        private B1: Variable<number> = new Variable<number>();

        public exec(vm: VM): Predicate {
          return this.method_2_cu1.exec(vm);
        }

        public Method_2_cu1: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                methodThis.B1.setValue(
                  outerThis.B.getValue() + outerThis.S.getValue()
                );
                console.log("B1: ", methodThis.B1.getValue());
                return methodThis.method_2_cu2;
              }
            }
        );

        public Method_2_cu2: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                const p: Predicate = new ForClass(
                  methodThis.B1,
                  outerThis.E,
                  outerThis.S,
                  outerThis.N,
                  outerThis.cont
                );
                return p;
              }
            }
        );

        private method_2_cu1 = new this.Method_2_cu1();
        private method_2_cu2 = new this.Method_2_cu2();
      }
  );
}

export const main = (input: { _B: number; _E: number; _S: number }) => {
  const vm: VM = new VM();
  const _B: Variable<number> = new Variable<number>(input._B);
  const _E: Variable<number> = new Variable<number>(input._E);
  const _S: Variable<number> = new Variable<number>(input._S);
  const _N: Variable<number> = new Variable<number>(0);
  const p: Predicate = new ForClass(_B, _E, _S, _N, Predicate.success);

  const result: {
    N: number;
  }[] = [];

  for (let s: boolean = vm.call(p); s === true; s = vm.redo()) {
    result.push({
      N: _N.getValue(),
    });
  }

  return result;
};
