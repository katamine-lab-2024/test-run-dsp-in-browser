import { Decimal } from "decimal.js";
import { Predicate } from "./Predicate";
import type { Variable } from "./Variable";

// new Case(target, [{ cond: 論理式1, expr: 式1 }, { cond: 論理式2, expr: 式2 }, ...])
export class Case<T extends string | number | boolean> implements Predicate {
  /**
   * ターゲット
   */
  private target: Variable<T>;
  /**
   * ケース
   */
  private cases: Array<{ cond: boolean; expr: T }>;
  private cond: Predicate;

  /**
   * `Case`クラスのコンストラクタ
   * @param target ターゲット
   * @param cases ケース
   */
  public constructor(
    target: Variable<T>,
    cases: Array<{ cond: boolean; expr: T | Decimal }>,
    cond: Predicate
  ) {
    this.target = target;
    this.cases = cases.map(({ cond, expr }) => {
      if (expr instanceof Decimal) {
        return { cond, expr: expr.toNumber() as T };
      }
      return { cond, expr };
    });
    this.cond = cond;
  }

  // 論理式1が成功したら式1の値を返す, 論理式2が成功したら式2の値を返す, ...
  // 1つ目から順に評価し, trueが来たら対応する式を返し、残りは評価されない
  public exec(): Predicate {
    for (const { cond, expr } of this.cases) {
      if (cond) {
        this.target.setValue(expr);
        return this.cond;
      }
    }
    return Predicate.failure;
  }
}
