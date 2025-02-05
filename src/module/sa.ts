new Decimal(
  outerThis._入口温度.getByIndex(methodThis.Num.getValue()).toString()
);
new Decimal(
  outerThis._入口温度.getByIndex(methodThis.Num.getValue()).toString()
);
new Decimal(
  outerThis._入口温度.getByIndex(methodThis.Num.getValue()).toString()
);
new Decimal(
  outerThis._入口温度.getByIndex(methodThis.Num.getValue()).toString()
);
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

export class ConfClass implements Predicate {
  private _入口流量: List<number>;
  private _入口温度: List<number>;
  private _接続元台数: Variable<number>;
  private _合流流量: Variable<number>;
  private _合流温度: Variable<number>;
  private cont: Predicate;

  public constructor(
    _入口流量: List<number>,
    _入口温度: List<number>,
    _接続元台数: Variable<number>,
    _合流流量: Variable<number>,
    _合流温度: Variable<number>,
    cont: Predicate
  ) {
    this._入口流量 = _入口流量;
    this._入口温度 = _入口温度;
    this._接続元台数 = _接続元台数;
    this._合流流量 = _合流流量;
    this._合流温度 = _合流温度;
    this.cont = cont;
  }

  public exec(vm: VM): Predicate {
    return new this.Method_1().exec(vm);
  }

  public Method_1: IC = createInnerClass(this).with(
    (outerThis) =>
      class implements Predicate {
        private Num: Variable<number> = new Variable<number>();

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
                  outerThis._入口温度.getLength(),
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
                outerThis._合流流量.setValue(
                  outerThis._入口流量
                    .getByIndex(methodThis.Num.getValue())
                    .getValue()
                );
                return new Case(
                  outerThis._合流温度,
                  [
                    {
                      cond: outerThis._入口流量.getSum() !== 0.0,
                      expr: new Decimal(
                        outerThis._入口温度
                          .getByIndex(methodThis.Num.getValue())
                          .toString()
                      )
                        .times(
                          new Decimal(
                            outerThis._入口流量
                              .getByIndex(methodThis.Num.getValue())
                              .toString()
                          )
                        )
                        .dividedBy(
                          new Decimal(outerThis._入口流量.getSum().toString())
                        ),
                    },
                    { cond: true, expr: 0.0 },
                  ],
                  outerThis.cont
                );
              }
            }
        );

        private method_1_cu1 = new this.Method_1_cu1();
        private method_1_cu2 = new this.Method_1_cu2();
      }
  );
}

export const main = (input: {
  __入口流量: number[];
  __入口温度: number[];
  __接続元台数: number;
}) => {
  const vm: VM = new VM();
  const __入口流量: List<number> = new List<number>(input.__入口流量);
  const __入口温度: List<number> = new List<number>(input.__入口温度);
  const __接続元台数: Variable<number> = new Variable<number>(
    input.__接続元台数
  );
  const __合流流量: Variable<number> = new Variable<number>(0);
  const __合流温度: Variable<number> = new Variable<number>(0);
  const p: Predicate = new ConfClass(
    __入口流量,
    __入口温度,
    __接続元台数,
    __合流流量,
    __合流温度,
    Predicate.success
  );

  const result: {
    _合流流量: number;
    _合流温度: number;
  }[] = [];

  for (let s: boolean = vm.call(p); s === true; s = vm.redo()) {
    result.push({
      _合流流量: __合流流量.getValue(),
      _合流温度: __合流温度.getValue(),
    });
  }

  return result;
};
