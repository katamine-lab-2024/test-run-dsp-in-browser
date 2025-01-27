import type { VM } from "./VM";
import { type IC, createInnerClass } from "./util";
import { Predicate } from "./Predicate";
import { Variable } from "./Variable";

export class For implements Predicate {
  /**
   * 出力変数
   */
  private x: Variable<number>;
  /**
   * 開始値
   */
  private from: Variable<number>;
  /**
   * 終了値
   */
  private to: Variable<number>;
  /**
   * ステップ
   */
  private by: Variable<number>;
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
  public constructor(
    x: Variable<number>,
    from: Variable<number> | number,
    to: Variable<number> | number,
    by: Variable<number> | number,
    cont: Predicate
  ) {
    this.x = x;
    if (typeof from === "number") {
      this.from = new Variable<number>(from);
    } else {
      this.from = from;
    }
    if (typeof to === "number") {
      this.to = new Variable<number>(to);
    } else {
      this.to = to;
    }
    if (typeof by === "number") {
      this.by = new Variable<number>(by);
    } else {
      this.by = by;
    }
    this.cont = cont;
  }

  public exec(vm: VM): Predicate {
    return new this.Method_1().exec(vm);
  }

  public Method_1: IC = createInnerClass(this).with(
    (outerThis) =>
      class implements Predicate {
        private i = outerThis.from.getNumberValue();

        public exec(vm: VM) {
          return this.cu1.exec(vm);
        }

        public Method_1_cu1: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                while (methodThis.i <= outerThis.to.getNumberValue()) {
                  outerThis.x.setValue(methodThis.i);
                  if (
                    methodThis.i + outerThis.by.getNumberValue() <=
                    outerThis.to.getNumberValue()
                  ) {
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
                methodThis.i += outerThis.by.getNumberValue();
                if (methodThis.i > outerThis.to.getNumberValue()) {
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
