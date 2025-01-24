import type { VM } from "./VM";

export class Success implements Predicate {
  private val: true;

  constructor() {
    this.val = true;
  }

  public exec(vm: VM): Predicate {
    return this;
  }

  public toString(): string {
    return "Success";
  }
}

export class Failure implements Predicate {
  private val: false;

  constructor() {
    this.val = false;
  }

  public exec(vm: VM): Predicate {
    return this;
  }

  public toString(): string {
    return "Failure";
  }
}

export abstract class Predicate {
  /**
   * 成功を表すインスタンス
   */
  static success: Success = new Success();
  /**
   * 失敗を表すインスタンス
   */
  static failure: Failure = new Failure();

  /**
   * 実行メソッド
   */
  public abstract exec(engine: VM): Predicate;
}
