import { Variable } from "./Variable";

export class List<T extends string | number | boolean> {
  /**
   * `Variable`型のリスト
   */
  private list: Array<Variable<T>> = [];

  /**
   * `List`クラスのコンストラクタ
   * @param val `string | number | boolean`型のリスト | `undefined`
   */
  public constructor(val?: Array<T>) {
    if (val === undefined) return;
    for (const item of val) {
      this.list.push(new Variable<T>(item));
    }
  }

  public getValue(): Array<T> {
    return this.list.map((v) => v.getValue());
  }

  /**
   * リストの長さを取得する
   * @returns リストの長さ
   */
  public getLength(): number {
    return this.list.length;
  }

  /**
   * 指定したインデックスの要素を取得する
   * @param index インデックス
   * @returns 指定したインデックスの要素
   */
  public getByIndex(index: number): Variable<T> {
    return this.list[index - 1];
  }

  /**
   * リストの要素の和を取得する
   */
  public getSum(): number {
    return this.list.reduce((acc, cur) => acc + cur.getNumberValue(), 0);
  }

  /**
   * リストを文字列に変換する
   * @returns リストの要素をカンマ区切りで連結した文字
   */
  public toString(): string {
    return this.list.map((v) => v.toString()).join(", ");
  }

  [Symbol.iterator]() {
    return this.list[Symbol.iterator]();
  }
}
