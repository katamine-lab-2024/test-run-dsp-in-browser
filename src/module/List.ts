import { Variable } from "./Variable";

export class List {
  /**
   * `Variable`型のリスト
   */
  private list: Array<Variable> = [];

  /**
   * `List`クラスのコンストラクタ
   * @param val `string | number | boolean`型のリスト | `undefined`
   */
  public constructor(val?: Array<Value>);
  public constructor(val: Array<Value>);

  public constructor(val?: Array<Value>) {
    if (val === undefined) return;
    for (let i = 0; i < val.length; i++) {
      this.list.push(new Variable(val[i]));
    }
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
  public getByIndex(index: number): Variable {
    return this.list[index];
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
