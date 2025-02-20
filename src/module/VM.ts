import { Predicate } from "./Predicate";

export class VM {
  /**
   * チョイスポイントを格納する配列
   */
  private choicePoints: Array<Predicate>;
  /**
   * チョイスポイントの現在位置
   */
  private ccp = -1;

  /**
   * `VM`クラスのコンストラクタ
   * @param initSize チョイスポイントの初期サイズ | undefined
   */
  public constructor(initSize?: number) {
    let localInitSize: number | undefined = initSize;
    if (localInitSize === undefined) {
      localInitSize = 100;
    }
    this.choicePoints = new Array<Predicate>(localInitSize);
  }

  /**
   * バックトラックのため次のゴールを格納する
   * @param c 格納するゴール
   */
  public setChoicePoint(c: Predicate): void {
    this.choicePoints[++this.ccp] = c;
  }

  /**
   * 現在のチョイスポイントを取得する
   * @returns 次のゴール
   */
  public getChoicePoint(): Predicate {
    return this.choicePoints[this.ccp];
  }

  /**
   * 現在のチョイスポイントを削除する
   */
  public popChoicePoint(): void {
    this.ccp--;
  }

  /**
   * 最終ゴールを実行する
   * @param goal
   * @returns 成功したら`true`、失敗したら`false`
   */
  public call(goal: Predicate): boolean {
    let localGoal: Predicate = goal;
    while (localGoal != null) {
      localGoal = localGoal.exec(this);
      if (localGoal === Predicate.success) {
        return true;
      }
      if (localGoal === Predicate.failure) {
        localGoal = this.getChoicePoint();
      }
    }
    return false;
  }

  /**
   * 強制的にバックトラックを行う
   * @returns `call`メソッドの戻り値
   */
  public redo(): boolean {
    const cp = this.getChoicePoint();
    if (!cp) return false;
    this.popChoicePoint();
    return this.call(cp);
  }

  // 例：VMクラスに追加するメソッド（非常に簡易な例）
  public jtry(first: Predicate, second: Predicate): Predicate {
    // 「first を実行する前に、second を choice point に積む」
    this.setChoicePoint(second);
    return first;
  }

  public trust(next: Predicate): Predicate {
    // 単に next を返す（choice point から次の候補を呼び出すとき用）
    return next;
  }
}
