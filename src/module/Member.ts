import type { List } from "./List";
import { Predicate } from "./Predicate";
import { createInnerClass, type IC } from "./util";
import type { Variable } from "./Variable";
import type { VM } from "./VM";

export class Member<T extends string | number | boolean> implements Predicate {
  /**
   * 要素の出力変数
   */
  private x: Variable<T>;
  /**
   * リスト
   */
  private l: List<T>;
  /**
   * 継続ゴール
   */
  private cont: Predicate;

  /**
   * `Member`クラスのコンストラクタ
   * @param x 要素の出力変数
   * @param l リスト
   * @param cont 継続ゴール
   */
  public constructor(x: Variable<T>, l: List<T>, cont: Predicate) {
    this.x = x;
    this.l = l;
    this.cont = cont;
  }

  public exec(vm: VM): Predicate {
    return new this.Method_1().exec(vm);
  }

  public Method_1: IC = createInnerClass(this).with(
    (outerThis) =>
      class implements Predicate {
        private i = 0;

        public exec(vm: VM) {
          return this.cu1.exec(vm);
        }

        public Method_1_cu1: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                while (methodThis.i < outerThis.l.getLength()) {
                  outerThis.x.setValue(
                    outerThis.l.getByIndex(methodThis.i).getValue()
                  );
                  if (methodThis.i + 1 < outerThis.l.getLength()) {
                    vm.setChoicePoint(methodThis.cu2);
                  }
                  return outerThis.cont;
                }
                return Predicate.failure;
              }
            }
        );

        public Method_1_cu2: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                methodThis.i++;
                if (methodThis.i >= outerThis.l.getLength()) {
                  return Predicate.failure;
                }

                vm.popChoicePoint();
                return methodThis.cu1.exec(vm);
              }
            }
        );

        private cu1 = new this.Method_1_cu1();
        private cu2 = new this.Method_1_cu2();
      }
  );
}
