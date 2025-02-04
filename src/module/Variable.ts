import Decimal from "decimal.js";

export class Variable<T extends string | number | boolean> {
  /**
   * `Variable`クラスの値の型
   * @type `string | number | boolean | null`
   */
  protected value: T | null = null;

  /**
   * `Variable`クラスのコンストラクタ
   * @param val `string | number | boolean | undefined`
   */
  public constructor(val?: T) {
    if (val === undefined) return;
    this.value = val;
  }

  /**
   * 値を設定する
   * @param v
   */
  public setValue(v: T | Decimal): void {
    if (v instanceof Decimal) {
      this.value = v.toNumber() as T;
    } else {
      this.value = v;
    }
  }

  /**
   * 値を取得する
   * @returns 値
   */
  public getValue(): T {
    if (this.value === null) throw new Error("null value");
    return this.value;
  }

  /**
   * 数値専用のゲッター
   * @returns number型の値
   * @throws 値がnumberでない場合
   */
  public getNumberValue(): number {
    if (!this.isNumber()) {
      throw new Error("Value is not a number");
    }
    return this.value;
  }

  /**
   * 文字列専用のゲッター
   * @returns string型の値
   * @throws 値がstringでない場合
   */
  public getStringValue(): string {
    if (!this.isString()) {
      throw new Error("Value is not a string");
    }
    return this.value;
  }

  /**
   * 値を文字列に変換する
   * @returns 値を文字列に変換した結果
   */
  public toString(): string {
    if (this.value === null) return "null";
    return this.value.toString();
  }

  /**
   * 値が`null`でないことを確認する
   */
  public isNotNull(): this is Variable<T> & { value: NonNullable<Value> } {
    return this.value !== null;
  }

  public isNumber(): this is Variable<T> & { value: number } {
    return typeof this.value === "number";
  }

  public isString(): this is Variable<T> & { value: string } {
    return typeof this.value === "string";
  }

  private toVariable(val: Variable<T> | T): Variable<T> {
    // もしすでに Variable ならそのまま返す。そうでなければ新しくラップする。
    if (val instanceof Variable) {
      return val;
    }
    return new Variable<T>(val as T);
  }

  public add(v: Variable<T>): Variable<T> {
    const operand = this.toVariable(v);
    if (this.isString() && operand.isString()) {
      return new Variable<T>((this.value + operand.value) as T);
    }
    return this.performOperation(operand, (a, b) => a.plus(b), "addition");
  }

  public sub(v: Variable<T> | T): Variable<T> {
    const operand = this.toVariable(v);
    return this.performOperation(operand, (a, b) => a.minus(b), "subtraction");
  }

  public mul(v: Variable<T> | T): Variable<T> {
    const operand = this.toVariable(v);
    return this.performOperation(
      operand,
      (a, b) => a.times(b),
      "multiplication"
    );
  }

  public div(v: Variable<T> | T): Variable<T> {
    const operand = this.toVariable(v);
    return this.performOperation(operand, (a, b) => a.dividedBy(b), "division");
  }

  public mod(v: Variable<T> | T): Variable<T> {
    const operand = this.toVariable(v);
    return this.performOperation(operand, (a, b) => a.mod(b), "modulo");
  }

  public pow(v: Variable<T> | T): Variable<T> {
    const operand = this.toVariable(v);
    return this.performOperation(
      operand,
      (a, b) => a.pow(b.toNumber()),
      "exponentiation"
    );
  }

  private performOperation(
    v: Variable<T>,
    operation: (a: Decimal, b: Decimal) => Decimal,
    operatorName: string
  ): Variable<T> {
    if (!this.isNotNull() || !v.isNotNull()) {
      throw new Error("null value");
    }

    if (this.isNumber() && v.isNumber()) {
      // / この.value と v.value は number と仮定
      const a = new Decimal(this.value);
      const b = new Decimal(v.value);
      const resultDecimal = operation(a, b);
      // 必要に応じて、Decimalの設定で丸めモードや精度を設定可能です
      const resultNumber = resultDecimal.toNumber();
      return new Variable<T>(resultNumber as T);
    }

    throw new Error(`Incompatible types for ${operatorName}`);
  }
}
