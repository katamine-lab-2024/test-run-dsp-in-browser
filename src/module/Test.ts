import type { Predicate } from "./Predicate";
import { createInnerClass, type IC } from "./util";
import { Variable } from "./Variable";
import type { VM } from "./VM";

export class Test implements Predicate {
  /**
   * 結果の出力変数
   */
  private result: Variable<boolean>;
  /**
   * 判定する式
   */
  private condition: boolean;
  /**
   * 継続ゴール
   */
  private cont: Predicate;

  /**
   * `Test`クラスのコンストラクタ
   * @param result 結果の出力変数
   * @param condition 判定する式
   * @param cont 継続ゴール
   */
  public constructor(
    condition: boolean,
    cont: Predicate,
    result?: Variable<boolean>
  ) {
    this.condition = condition;
    this.cont = cont;
    this.result = result ?? new Variable(false);
  }

  public exec(vm: VM): Predicate {
    return new this.Method_1().exec(vm);
  }

  public Method_1: IC = createInnerClass(this).with(
    (outerThis) =>
      class implements Predicate {
        public exec(vm: VM): Predicate {
          return new this.Method_1_cu1().exec(vm);
        }

        public Method_1_cu1: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                if (outerThis.condition) {
                  outerThis.result.setValue(true);
                }
                outerThis.result.setValue(false);
                return outerThis.cont;
              }
            }
        );
      }
  );
}
