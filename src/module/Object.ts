import { Variable } from "./Variable";

export class VObject<U extends { [K in keyof U]: string | number | boolean }> {
  /**
   * `Variable`型のオブジェクト
   */

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  private o: { [K in keyof U]: Variable<U[K]> } = {} as any;

  /**
   * `VObject`クラスのコンストラクタ
   */
  public constructor(val?: U) {
    if (val === undefined) return;
    for (const key in val) {
      this.o[key] = new Variable(val[key]);
    }
  }

  public setValue(val: U): void {
    for (const key in val) {
      this.o[key].setValue(val[key]);
    }
  }

  public setValueByKey<K extends keyof U>(
    key: K,
    val: U[K] | Variable<U[K]>
  ): void {
    if (val instanceof Variable) {
      this.o[key] = val;
    } else {
      this.o[key].setValue(val);
    }
  }

  public getValue(): U {
    const obj = {} as U;
    for (const key in this.o) {
      obj[key] = this.o[key].getValue();
    }
    return obj;
  }

  /**
   * オブジェクトの長さを取得する
   * @returns オブジェクトの長さ
   */
  public getLength(): number {
    return Object.keys(this.o).length;
  }

  /**
   * 指定したキーの要素を取得する
   * @param key キー
   * @returns 指定したキーの要素
   */
  public getByKey<K extends keyof U>(key: K): U[K] {
    return this.o[key].getValue();
  }

  /**
   * オブジェクトを文字列に変換する
   * @returns オブジェクトの要素をカンマ区切りで連結した文字
   */
  public toString(): string {
    return Object.keys(this.o)
      .map((k) => `${k}: ${this.o[k as keyof U].toString()}`)
      .join(", ");
  }

  [Symbol.iterator]() {
    return Object.keys(this.o)[Symbol.iterator]();
  }
}
