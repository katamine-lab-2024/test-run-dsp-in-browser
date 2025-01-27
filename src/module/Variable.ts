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
  public setValue(v: T): void {
    this.value = v;
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

  public add(v: Variable<T>): Variable<T> {
    if (this.isString() && v.isString()) {
      return new Variable<T>((this.value + v.value) as T);
    }
    return this.performOperation(v, (a, b) => a + b, "addition");
  }

  public sub(v: Variable<T>): Variable<T> {
    return this.performOperation(v, (a, b) => a - b, "subtraction");
  }

  public mul(v: Variable<T>): Variable<T> {
    return this.performOperation(v, (a, b) => a * b, "multiplication");
  }

  public div(v: Variable<T>): Variable<T> {
    return this.performOperation(v, (a, b) => a / b, "division");
  }

  public mod(v: Variable<T>): Variable<T> {
    return this.performOperation(v, (a, b) => a % b, "modulo");
  }

  private performOperation(
    v: Variable<T>,
    operation: (a: number, b: number) => number,
    operatorName: string
  ): Variable<T> {
    if (!this.isNotNull() || !v.isNotNull()) {
      throw new Error("null value");
    }

    if (this.isNumber() && v.isNumber()) {
      return new Variable<T>(operation(this.value, v.value) as T);
    }

    throw new Error(`Incompatible types for ${operatorName}`);
  }
}
