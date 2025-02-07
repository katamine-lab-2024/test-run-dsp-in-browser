import Decimal from "decimal.js";
import { type IC, createInnerClass } from "./util";
import { Predicate } from "./Predicate";
import { Variable } from "./Variable";
import { List } from "./List";
import { VObject } from "./Object";
import { Case } from "./Case";
import { VM } from "./VM";
import { For } from "./For";
import { Member } from "./Member";

export class TotalHeatDissipationClass implements Predicate {
  private _ModelList: List<string>;
  private _cdwWList: List<number>;
  private _ENV_OADB: Variable<number>;
  private _OARHexit: Variable<number>;
  private _OARHent: Variable<number>;
  private _cdwTentList: List<number>;
  private _PinList: List<number>;
  private _PspecList: List<number>;
  private _GspecList: List<number>;
  private _RadspecList: List<number>;
  private _Rade: Variable<number>;
  private _LF: Variable<number>;
  private _cdwTexit: Variable<number>;
  private _apT: Variable<number>;
  private cont: Predicate;

  public constructor(
    _ModelList: List<string>,
    _cdwWList: List<number>,
    _ENV_OADB: Variable<number>,
    _OARHexit: Variable<number>,
    _OARHent: Variable<number>,
    _cdwTentList: List<number>,
    _PinList: List<number>,
    _PspecList: List<number>,
    _GspecList: List<number>,
    _RadspecList: List<number>,
    _Rade: Variable<number>,
    _LF: Variable<number>,
    _cdwTexit: Variable<number>,
    _apT: Variable<number>,
    cont: Predicate
  ) {
    this._ModelList = _ModelList;
    this._cdwWList = _cdwWList;
    this._ENV_OADB = _ENV_OADB;
    this._OARHexit = _OARHexit;
    this._OARHent = _OARHent;
    this._cdwTentList = _cdwTentList;
    this._PinList = _PinList;
    this._PspecList = _PspecList;
    this._GspecList = _GspecList;
    this._RadspecList = _RadspecList;
    this._Rade = _Rade;
    this._LF = _LF;
    this._cdwTexit = _cdwTexit;
    this._apT = _apT;
    this.cont = cont;
  }

  public exec(vm: VM): Predicate {
    return new this.Method_1().exec(vm);
  }

  public Method_1: IC = createInnerClass(this).with(
    (outerThis) =>
      class implements Predicate {
        private Num: Variable<number> = new Variable<number>();
        private _Pin: Variable<number> = new Variable<number>();
        private _Pspec: Variable<number> = new Variable<number>();
        private _Gspec: Variable<number> = new Variable<number>();
        private _Radspec: Variable<number> = new Variable<number>();
        private _cdwTent: Variable<number> = new Variable<number>();
        private _cdwW: Variable<number> = new Variable<number>();
        private _飽和水蒸気圧h2: Variable<number> = new Variable<number>();
        private _飽和水蒸気圧h1: Variable<number> = new Variable<number>();
        private _水蒸気分圧h2: Variable<number> = new Variable<number>();
        private _水蒸気分圧: Variable<number> = new Variable<number>();
        private _OAAHexit: Variable<number> = new Variable<number>();
        private _OAAHent: Variable<number> = new Variable<number>();
        private _ENexit: Variable<number> = new Variable<number>();
        private _ENin: Variable<number> = new Variable<number>();
        private _idealG: Variable<number> = new Variable<number>();
        private _heatH: Variable<number> = new Variable<number>();
        private _idealRad: Variable<number> = new Variable<number>();
        private _ENV_OAWB: Variable<number> = new Variable<number>();
        private _constraint_cdwTexit: Variable<boolean> =
          new Variable<boolean>();

        public exec(vm: VM): Predicate {
          return this.method_1_cu1.exec(vm);
        }

        public Method_1_cu1: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                return new For(
                  methodThis.Num,
                  1,
                  outerThis._ModelList.getLength(),
                  1,
                  methodThis.method_1_cu2
                );
              }
            }
        );

        public Method_1_cu2: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                methodThis._cdwTent.setValue(
                  outerThis._cdwTentList
                    .getByIndex(methodThis.Num.getValue())
                    .getValue()
                );
                methodThis._Pin.setValue(
                  outerThis._PinList
                    .getByIndex(methodThis.Num.getValue())
                    .getValue()
                );
                methodThis._飽和水蒸気圧h2.setValue(
                  Decimal.exp(
                    new Decimal("6.18145")
                      .times(new Decimal("10").pow(new Decimal("12").neg()))
                      .times(
                        new Decimal(methodThis._cdwTent.getValue()).pow(
                          new Decimal("5")
                        )
                      )
                      .minus(
                        new Decimal("3.42981")
                          .times(new Decimal("10").pow(new Decimal("9").neg()))
                          .times(
                            new Decimal(methodThis._cdwTent.getValue()).pow(
                              new Decimal("4")
                            )
                          )
                      )
                      .plus(
                        new Decimal("1.11342")
                          .times(new Decimal("10").pow(new Decimal("6").neg()))
                          .times(
                            new Decimal(methodThis._cdwTent.getValue()).pow(
                              new Decimal("3")
                            )
                          )
                      )
                      .minus(
                        new Decimal("2.98633")
                          .times(new Decimal("10").pow(new Decimal("4").neg()))
                          .times(
                            new Decimal(methodThis._cdwTent.getValue()).pow(
                              new Decimal("2")
                            )
                          )
                      )
                      .plus(
                        new Decimal("7.26543")
                          .times(new Decimal("10").pow(new Decimal("2").neg()))
                          .times(new Decimal(methodThis._cdwTent.getValue()))
                      )
                      .minus(new Decimal("5.11134"))
                  )
                    .times(new Decimal("760"))
                    .times(new Decimal("133.32"))
                );
                methodThis._水蒸気分圧h2.setValue(
                  new Decimal(outerThis._OARHexit.getValue())
                    .times(new Decimal(methodThis._飽和水蒸気圧h2.getValue()))
                    .dividedBy(new Decimal("100"))
                );
                methodThis._OAAHexit.setValue(
                  new Decimal("0.622")
                    .times(new Decimal(methodThis._水蒸気分圧h2.getValue()))
                    .dividedBy(
                      new Decimal("101325").minus(
                        new Decimal(methodThis._水蒸気分圧h2.getValue())
                      )
                    )
                );
                methodThis._ENexit.setValue(
                  new Decimal("1.006")
                    .times(new Decimal(methodThis._cdwTent.getValue()))
                    .plus(
                      new Decimal("1.805")
                        .times(new Decimal(methodThis._cdwTent.getValue()))
                        .plus(new Decimal("2501"))
                        .times(new Decimal(methodThis._OAAHexit.getValue()))
                    )
                );
                methodThis._飽和水蒸気圧h1.setValue(
                  Decimal.exp(
                    new Decimal("6.18145")
                      .times(new Decimal("10").pow(new Decimal("12").neg()))
                      .times(
                        new Decimal(outerThis._ENV_OADB.getValue()).pow(
                          new Decimal("5")
                        )
                      )
                      .minus(
                        new Decimal("3.42981")
                          .times(new Decimal("10").pow(new Decimal("9").neg()))
                          .times(
                            new Decimal(outerThis._ENV_OADB.getValue()).pow(
                              new Decimal("4")
                            )
                          )
                      )
                      .plus(
                        new Decimal("1.11342")
                          .times(new Decimal("10").pow(new Decimal("6").neg()))
                          .times(
                            new Decimal(outerThis._ENV_OADB.getValue()).pow(
                              new Decimal("3")
                            )
                          )
                      )
                      .minus(
                        new Decimal("2.98633")
                          .times(new Decimal("10").pow(new Decimal("4").neg()))
                          .times(
                            new Decimal(outerThis._ENV_OADB.getValue()).pow(
                              new Decimal("2")
                            )
                          )
                      )
                      .plus(
                        new Decimal("7.26543")
                          .times(new Decimal("10").pow(new Decimal("2").neg()))
                          .times(new Decimal(outerThis._ENV_OADB.getValue()))
                      )
                      .minus(new Decimal("5.11134"))
                  )
                    .times(new Decimal("760"))
                    .times(new Decimal("133.32"))
                );
                methodThis._水蒸気分圧.setValue(
                  new Decimal(outerThis._OARHent.getValue())
                    .times(new Decimal(methodThis._飽和水蒸気圧h1.getValue()))
                    .dividedBy(new Decimal("100"))
                );
                methodThis._OAAHent.setValue(
                  new Decimal("0.622")
                    .times(new Decimal(methodThis._水蒸気分圧.getValue()))
                    .dividedBy(
                      new Decimal("101325").minus(
                        new Decimal(methodThis._水蒸気分圧.getValue())
                      )
                    )
                );
                methodThis._ENin.setValue(
                  new Decimal("1.006")
                    .times(new Decimal(outerThis._ENV_OADB.getValue()))
                    .plus(
                      new Decimal("1.805")
                        .times(new Decimal(outerThis._ENV_OADB.getValue()))
                        .plus(new Decimal("2501"))
                        .times(new Decimal(methodThis._OAAHent.getValue()))
                    )
                );
                methodThis._Gspec.setValue(
                  outerThis._GspecList
                    .getByIndex(methodThis.Num.getValue())
                    .getValue()
                );
                methodThis._Pspec.setValue(
                  outerThis._PspecList
                    .getByIndex(methodThis.Num.getValue())
                    .getValue()
                );
                methodThis._idealG.setValue(
                  new Decimal(methodThis._Gspec.getValue()).times(
                    new Decimal(methodThis._Pin.getValue())
                      .dividedBy(new Decimal(methodThis._Pspec.getValue()))
                      .pow(new Decimal("1").dividedBy(new Decimal("3")))
                  )
                );
                methodThis._idealRad.setValue(
                  new Decimal(methodThis._ENexit.getValue())
                    .minus(new Decimal(methodThis._ENin.getValue()))
                    .times(new Decimal(methodThis._idealG.getValue()))
                    .times(new Decimal("1.161"))
                    .times(new Decimal("1000"))
                );
                methodThis._cdwW.setValue(
                  outerThis._cdwWList
                    .getByIndex(methodThis.Num.getValue())
                    .getValue()
                );
                methodThis._heatH.setValue(
                  new Decimal("6.08")
                    .times(new Decimal("10").pow(new Decimal("6").neg()))
                    .times(new Decimal(methodThis._Pin.getValue()))
                    .plus(
                      new Decimal("0.0134371")
                        .neg()
                        .times(new Decimal(methodThis._cdwTent.getValue()))
                    )
                    .plus(
                      new Decimal("27.1227").times(
                        new Decimal(methodThis._cdwW.getValue())
                      )
                    )
                    .plus(
                      new Decimal("0.171")
                        .neg()
                        .times(new Decimal(methodThis._OAAHent.getValue()))
                    )
                    .plus(
                      new Decimal("4.01")
                        .neg()
                        .times(new Decimal("10").pow(new Decimal("10").neg()))
                        .times(new Decimal(methodThis._Pin.getValue()))
                        .times(new Decimal(methodThis._Pin.getValue()))
                    )
                    .plus(
                      new Decimal("5.17")
                        .times(new Decimal("10").pow(new Decimal("7").neg()))
                        .times(new Decimal(methodThis._Pin.getValue()))
                        .times(new Decimal(methodThis._cdwTent.getValue()))
                    )
                    .plus(
                      new Decimal("9.41")
                        .neg()
                        .times(new Decimal("10").pow(new Decimal("5").neg()))
                        .times(new Decimal(methodThis._Pin.getValue()))
                        .times(new Decimal(methodThis._cdwW.getValue()))
                    )
                    .plus(
                      new Decimal("0.000989227")
                        .neg()
                        .times(new Decimal(methodThis._Pin.getValue()))
                        .times(new Decimal(methodThis._OAAHent.getValue()))
                    )
                    .plus(
                      new Decimal("0.000252793")
                        .times(new Decimal(methodThis._cdwTent.getValue()))
                        .times(new Decimal(methodThis._cdwTent.getValue()))
                    )
                    .plus(
                      new Decimal("0.6535")
                        .neg()
                        .times(new Decimal(methodThis._cdwTent.getValue()))
                        .times(new Decimal(methodThis._cdwW.getValue()))
                    )
                    .plus(
                      new Decimal("1.34834")
                        .times(new Decimal(methodThis._cdwTent.getValue()))
                        .times(new Decimal(methodThis._OAAHent.getValue()))
                    )
                    .plus(
                      new Decimal("46.4248")
                        .neg()
                        .times(new Decimal(methodThis._cdwW.getValue()))
                        .times(new Decimal(methodThis._cdwW.getValue()))
                    )
                    .plus(
                      new Decimal("610.065")
                        .times(new Decimal(methodThis._cdwW.getValue()))
                        .times(new Decimal(methodThis._OAAHent.getValue()))
                    )
                    .plus(
                      new Decimal("2364.73")
                        .neg()
                        .times(new Decimal(methodThis._OAAHent.getValue()))
                        .times(new Decimal(methodThis._OAAHent.getValue()))
                    )
                    .plus(new Decimal("0.217912"))
                );
                return new Case(
                  outerThis._Rade,
                  [
                    { cond: methodThis._Pin.getValue() <= 0, expr: 170672.7 },
                    {
                      cond: 0 < methodThis._Pin.getValue(),
                      expr: new Decimal(methodThis._idealRad.getValue()).times(
                        new Decimal(methodThis._heatH.getValue())
                      ),
                    },
                  ],
                  methodThis.method_1_cu3
                );
              }
            }
        );

        public Method_1_cu3: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                outerThis._cdwTexit.setValue(
                  new Decimal(methodThis._cdwTent.getValue()).minus(
                    new Decimal(outerThis._Rade.getValue()).dividedBy(
                      new Decimal("4.186")
                        .times(new Decimal(methodThis._cdwW.getValue()))
                        .times(new Decimal("10").pow(new Decimal("6")))
                    )
                  )
                );
                methodThis._constraint_cdwTexit.setValue(
                  0 < outerThis._cdwTexit.getValue() &&
                    outerThis._cdwTexit.getValue() < 100
                );
                return methodThis.method_1_cu4;
              }
            }
        );

        public Method_1_cu4: IC = createInnerClass(this).with(
          (methodThis) =>
            class implements Predicate {
              public exec(vm: VM) {
                methodThis._Radspec.setValue(
                  outerThis._RadspecList
                    .getByIndex(methodThis.Num.getValue())
                    .getValue()
                );
                methodThis._ENV_OAWB.setValue(
                  new Decimal("2.15048e-010")
                    .times(
                      new Decimal(methodThis._ENin.getValue()).pow(
                        new Decimal("5")
                      )
                    )
                    .minus(
                      new Decimal("1.31767e-007").times(
                        new Decimal(methodThis._ENin.getValue()).pow(
                          new Decimal("4")
                        )
                      )
                    )
                    .plus(
                      new Decimal("3.52421e-005").times(
                        new Decimal(methodThis._ENin.getValue()).pow(
                          new Decimal("3")
                        )
                      )
                    )
                    .minus(
                      new Decimal("0.00565988").times(
                        new Decimal(methodThis._ENin.getValue()).pow(
                          new Decimal("2")
                        )
                      )
                    )
                    .plus(
                      new Decimal("0.691948").times(
                        new Decimal(methodThis._ENin.getValue())
                      )
                    )
                    .minus(new Decimal("6.0524"))
                    .dividedBy(
                      new Decimal("1").plus(
                        new Decimal(methodThis._OAAHent.getValue()).times(
                          new Decimal("3.60379e-009")
                            .times(
                              new Decimal(methodThis._ENin.getValue()).pow(
                                new Decimal("4")
                              )
                            )
                            .minus(
                              new Decimal("1.95259e-006").times(
                                new Decimal(methodThis._ENin.getValue()).pow(
                                  new Decimal("3")
                                )
                              )
                            )
                            .plus(
                              new Decimal("0.000418588").times(
                                new Decimal(methodThis._ENin.getValue()).pow(
                                  new Decimal("2")
                                )
                              )
                            )
                            .minus(
                              new Decimal("0.0465277").times(
                                new Decimal(methodThis._ENin.getValue())
                              )
                            )
                            .plus(new Decimal("2.88767"))
                        )
                      )
                    )
                );
                outerThis._apT.setValue(
                  new Decimal(outerThis._cdwTexit.getValue()).minus(
                    new Decimal(methodThis._ENV_OAWB.getValue())
                  )
                );
                outerThis._LF.setValue(
                  new Decimal(outerThis._Rade.getValue()).dividedBy(
                    new Decimal(methodThis._Radspec.getValue())
                  )
                );
                return outerThis.cont;
              }
            }
        );

        private method_1_cu1 = new this.Method_1_cu1();
        private method_1_cu2 = new this.Method_1_cu2();
        private method_1_cu3 = new this.Method_1_cu3();
        private method_1_cu4 = new this.Method_1_cu4();
      }
  );
}

export const main = (input: {
  __ModelList: string[];
  __cdwWList: number[];
  __ENV_OADB: number;
  __OARHexit: number;
  __OARHent: number;
  __cdwTentList: number[];
  __PinList: number[];
  __PspecList: number[];
  __GspecList: number[];
  __RadspecList: number[];
}) => {
  const vm: VM = new VM();
  const __ModelList: List<string> = new List<string>(input.__ModelList);
  const __cdwWList: List<number> = new List<number>(input.__cdwWList);
  const __ENV_OADB: Variable<number> = new Variable<number>(input.__ENV_OADB);
  const __OARHexit: Variable<number> = new Variable<number>(input.__OARHexit);
  const __OARHent: Variable<number> = new Variable<number>(input.__OARHent);
  const __cdwTentList: List<number> = new List<number>(input.__cdwTentList);
  const __PinList: List<number> = new List<number>(input.__PinList);
  const __PspecList: List<number> = new List<number>(input.__PspecList);
  const __GspecList: List<number> = new List<number>(input.__GspecList);
  const __RadspecList: List<number> = new List<number>(input.__RadspecList);
  const __Rade: Variable<number> = new Variable<number>(0);
  const __LF: Variable<number> = new Variable<number>(0);
  const __cdwTexit: Variable<number> = new Variable<number>(0);
  const __apT: Variable<number> = new Variable<number>(0);
  const p: Predicate = new TotalHeatDissipationClass(
    __ModelList,
    __cdwWList,
    __ENV_OADB,
    __OARHexit,
    __OARHent,
    __cdwTentList,
    __PinList,
    __PspecList,
    __GspecList,
    __RadspecList,
    __Rade,
    __LF,
    __cdwTexit,
    __apT,
    Predicate.success
  );

  const result: {
    _Rade: number;
    _LF: number;
    _cdwTexit: number;
    _apT: number;
  }[] = [];

  for (let s: boolean = vm.call(p); s === true; s = vm.redo()) {
    result.push({
      _Rade: __Rade.getValue(),
      _LF: __LF.getValue(),
      _cdwTexit: __cdwTexit.getValue(),
      _apT: __apT.getValue(),
    });
  }

  return result;
};
