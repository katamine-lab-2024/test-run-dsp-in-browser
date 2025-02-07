import { NEW_STRUCT_TYPE } from "./constant";
import type {
  BuildInNode,
  Class,
  Expr,
  Primary,
  Program,
  StmtNode,
  StructNode,
  VarNode,
} from "./types/newAst";
import type { NewType } from "./types/type";

class CodeGenerator {
  private prog: Program;
  private output: string[] = [];

  constructor(prog: Program) {
    this.prog = prog;
  }

  private _getTypeMember = (f: NewType, isDecl: boolean): string => {
    if (f.type === NEW_STRUCT_TYPE.ARRAY) {
      let innerMemberType = "";
      if (
        f.member[0].type === NEW_STRUCT_TYPE.ARRAY ||
        f.member[0].type === NEW_STRUCT_TYPE.OBJECT
      ) {
        innerMemberType = this._getTypeMember(f.member[0], isDecl);
      }
      innerMemberType = f.member[0].type;
      return isDecl ? `${innerMemberType}[]` : `List<${innerMemberType}>`;
    }
    if (f.type === NEW_STRUCT_TYPE.OBJECT) {
      const innerMemberType = f.member.map((m) => {
        if (
          m.type === NEW_STRUCT_TYPE.ARRAY ||
          m.type === NEW_STRUCT_TYPE.OBJECT
        ) {
          return this._getTypeMember(m, isDecl);
        }
        return m.type;
      });
      return isDecl
        ? `{${innerMemberType.map((m, i) => `${i + 1}: ${m};`).join(" ")}}`
        : `VObject<{${innerMemberType
            .map((m, i) => `${i + 1}: ${m};`)
            .join(" ")}}>`;
    }
    return isDecl ? f.type : `Variable<${f.type}>`;
  };

  public generate(): string {
    this.addImports();
    this.addClasses();
    this.genMain();
    return this.output.join("\n");
  }

  private addImports(): void {
    const imt = [
      'import Decimal from "decimal.js";',
      'import { type IC, createInnerClass } from "./util";',
      'import { Predicate } from "./Predicate";',
      'import { Variable } from "./Variable";',
      'import { List } from "./List";',
      'import { VObject } from "./Object";',
      'import { Case } from "./Case";',
      'import { VM } from "./VM";',
      'import { For } from "./For";',
      'import { Member } from "./Member";',
    ];
    this.output.push(...imt, "");
  }

  private addClasses(): void {
    const classList = this.prog.body.filter((stmt) => stmt.type !== "dummy");
    for (const module of classList) {
      this.output.push(...this.codeClass(module), "");
    }
  }

  private genMain(): void {
    const fieldList = this.prog.body
      .filter((cls) => cls.type !== "dummy")
      .flatMap((c) => c.fieldList.filter((f) => f.type !== "dummy"))
      .flatMap((p) => p.value);
    const inputField = fieldList.filter((f) => f.isInput);
    const clsName = this.prog.body.filter((cls) => cls.type !== "dummy")[0]
      .name;

    const inputDecl =
      inputField.length !== 0
        ? [
            "input: {",
            ...inputField.map(
              (f) => `  _${f.name}: ${this._getTypeMember(f.valueType, true)};`
            ),
            "}",
          ]
        : [];
    const decl = ["export const main = (", ...inputDecl, ") => {"];
    const setup = [
      "const vm: VM = new VM();",
      ...fieldList.map(
        (f) =>
          `const _${f.name}: ${this._getTypeMember(
            f.valueType,
            false
          )} = new ${this._getTypeMember(f.valueType, false)}(${
            f.isInput
              ? `input._${f.name}`
              : f.valueType.type === "number"
              ? "0"
              : f.valueType.type === "string"
              ? '""'
              : f.valueType.type === "object"
              ? `{${f.valueType.member
                  .map((m, i) => `${i + 1}: ${m.type === "number" ? 0 : '""'}`)
                  .join(", ")}}`
              : ""
          });`
      ),
      `const p: Predicate = new ${
        clsName.charAt(0).toUpperCase() + clsName.slice(1)
      }Class (${fieldList
        .map((f) => `_${f.name}`)
        .join(", ")}, Predicate.success);`,
    ];
    const result = [
      "const result: {",
      ...fieldList
        .filter((v) => !v.isInput)
        .map((f) => `  ${f.name}: ${f.valueType.type};`),
      "}[] = [];",
    ];
    const run = [
      "for (let s: boolean = vm.call(p); s === true; s = vm.redo()) {",
      "  result.push({",
      ...fieldList
        .filter((v) => !v.isInput)
        .map((f) => `    ${f.name}: _${f.name}.getValue(),`),
      "})",
      "}",
    ];

    this.output.push(
      ...decl,
      ...setup,
      "",
      ...result,
      "",
      ...run,
      "",
      "  return result;",
      "}"
    );
  }

  private codeClass(module: Class): string[] {
    const name = module.name;
    const classDecl = `export class ${
      name.charAt(0).toUpperCase() + name.slice(1)
    }Class implements Predicate {`;

    const field = [
      ...module.fieldList
        .filter((p) => p.type !== "dummy")
        .flatMap((p) =>
          p.value.map(
            (v) =>
              `  private ${v.name}: ${this._getTypeMember(v.valueType, false)};`
          )
        ),
      "  private cont: Predicate;",
      "",
    ];

    const construct = [
      "  public constructor(",
      ...module.fieldList
        .filter((p) => p.type !== "dummy")
        .flatMap((p) =>
          p.value.map(
            (v) => `    ${v.name}: ${this._getTypeMember(v.valueType, false)},`
          )
        ),
      "    cont: Predicate",
      "  ) {",
      ...module.fieldList
        .filter((p) => p.type !== "dummy")
        .flatMap((p) => p.value.map((v) => `    this.${v.name} = ${v.name};`)),
      "    this.cont = cont;",
      "  }",
      "",
    ];

    const blockList = module.body.filter((stmt) => stmt.type === "class");

    let exec: string[] = [];

    if (blockList.length === 1) {
      let whenStmt: undefined | string;
      if (blockList[0].when) {
        let condStr = this.exprGen(blockList[0].when, {
          isVarRef: false,
          isString: false,
        });
        if (condStr.includes("outerThis"))
          condStr = condStr.replaceAll("outerThis", "this");
        whenStmt = [
          `    const method_${blockList[0].name} = (function() {
          if (!(${condStr})) {
             return Predicate.failure;
          }
          return new this.Method_${blockList[0].name}();
        }).call(this)`,
          `      return vm.jtry(method_${blockList[0].name}, this.cont);`,
        ].join("\n");
      }
      exec = [
        "  public exec(vm: VM): Predicate {",
        ...(whenStmt
          ? [whenStmt]
          : blockList.map(
              (block) => `    return new this.Method_${block.name}().exec(vm);`
            )),
        "  }",
        "",
      ];
    } else {
      // blockのクラスをインスタンス化
      const methodCandidateNames = blockList.map(
        (block) => `method_${block.name}`
      );
      const methodCandidates = blockList.map((block) => {
        if (block.when) {
          let condStr = this.exprGen(block.when, {
            isVarRef: false,
            isString: false,
          });
          if (condStr.includes("outerThis"))
            condStr = condStr.replaceAll("outerThis", "this");
          return `    const method_${block.name} = (function() {
            if (!(${condStr})) {
               return Predicate.failure;
            }
            return new this.Method_${block.name}();
          }).call(this)`;
        }
        return `    const method_${block.name} = new this.Method_${block.name}();`;
      });
      // methodを連結
      let chain = methodCandidateNames[methodCandidateNames.length - 1];
      for (let i = methodCandidateNames.length - 2; i >= 0; i--) {
        chain = `vm.jtry(${methodCandidateNames[i]}, ${chain})`;
      }
      exec = [
        "  public exec(vm: VM): Predicate {",
        methodCandidates.join("\n"),
        "",
        `return ${chain};`,
        "  }",
        "",
      ];
    }

    const blockContents: string[][] = [];
    for (const block of blockList) {
      blockContents.push([...this.codeBlock(block), ""]);
    }

    return [
      classDecl,
      ...field,
      ...construct,
      ...exec,
      ...blockContents.flat(),
      "}",
    ];
  }

  private codeBlock(block: Class): string[] {
    const name = `Method_${block.name}`;
    const classDecl = [
      `  public ${name}: IC = createInnerClass(this).with(`,
      "    (outerThis) =>",
      "      class implements Predicate {",
    ];

    const field = [
      ...block.fieldList
        .filter((p) => p.type !== "dummy")
        .flatMap((p) =>
          p.value.map(
            (v) =>
              `        private ${v.name}: ${this._getTypeMember(
                v.valueType,
                false
              )} = new ${this._getTypeMember(v.valueType, false)}();`
          )
        ),
      "",
    ];

    const stmtList = block.body.filter(
      (stmt) => stmt.type !== "dummy" && stmt.type !== "method"
    );

    const exec = [
      "        public exec(vm: VM): Predicate {",
      `          return this.${name.toLowerCase()}_cu${
        stmtList[0].name
      }.exec(vm);`,
      "        }",
      "",
    ];

    const stmtContents: string[][] = [];
    for (let i = 0; i < stmtList.length; i++) {
      const stmt = stmtList[i];
      const nextName = stmtList[i + 1] ? stmtList[i + 1].name : undefined;
      stmtContents.push([...this.codeStmt(stmt, name, nextName), ""]);
    }

    const stmtInstanceList = stmtList.map(
      (s) =>
        `        private ${name.toLowerCase()}_cu${
          s.name
        } = new this.${name}_cu${s.name}();`
    );

    return [
      ...classDecl,
      ...field,
      ...exec,
      ...stmtContents.flat(),
      ...stmtInstanceList,
      "      }",
      "  );",
    ];
  }

  private codeStmt(
    stmt: Class,
    blockName: string,
    cont: string | undefined
  ): string[] {
    // whenNodeを含むなら生成しない
    let isWhen = false;

    const c = cont
      ? `methodThis.${blockName.toLowerCase()}_cu${cont}`
      : "outerThis.cont";

    const name = `${blockName}_cu${stmt.name}`;
    const classDecl = [
      `        public ${name}: IC = createInnerClass(this).with(`,
      "          (methodThis) =>",
      "            class implements Predicate {",
    ];

    const execBodyContents: string[] = [];
    const methodList = stmt.body.filter(
      (stmt) => stmt.type !== "dummy" && stmt.type !== "class"
    );
    for (const method of methodList) {
      execBodyContents.push(
        ...method.body.flatMap((stmt) => {
          const s = this.stmtGen(stmt, c);
          if (s === "when") {
            isWhen = true;
            return [];
          }
          return [
            this.stmtGen(stmt, c),
            stmt === method.body[method.body.length - 1] &&
            stmt.type === "assign"
              ? `\n                return ${c};`
              : "",
          ].join("");
        })
      );
    }
    const exec = [
      "              public exec(vm: VM) {",
      ...execBodyContents,
      "              }",
    ];
    if (isWhen) return [];
    return [...classDecl, ...exec, "            }", "        );"];
  }

  private stmtGen(stmt: StmtNode, cont: string | undefined): string {
    switch (stmt.type) {
      case "when": {
        return "when";
      }
      case "if": {
        const cond = this.exprGen(stmt.cond, {
          isVarRef: false,
          isString: false,
        });
        if (cond.includes("constraint")) {
          return `                return ${cont};`;
        }
        return [
          `                if (!(${cond})) {`,
          "                  return Predicate.failure;",
          "                }",
          `                return ${cont};`,
        ].join("\n");
      }
      case "assign": {
        if (stmt.lhs.type === "object" && stmt.lhs.isDestructuring) {
          // 右辺の生成コードを取得（例: "outerThis.R" となる想定）
          const rhsExpr = this.primaryGen(stmt.rhs as Primary, {
            isVarRef: true,
          });
          // 右辺の Variable の getValue() を利用して、配列（またはベクトル）として扱うと仮定
          const assignments: string[] = [];
          for (let i = 0; i < stmt.lhs.member.length; i++) {
            const member = stmt.lhs.member[i];
            const ths =
              (member.value as VarNode).isInParam === true
                ? "outerThis"
                : "methodThis";
            // 各変数の名前は member.value.name として取得できると仮定
            // 右辺から i 番目の要素を取り出すには、getValue()[i] とします。
            assignments.push(
              `                ${ths}.${
                (member.value as VarNode).name
              }.setValue(${rhsExpr}.getByKey(${i + 1}));`
            );
          }
          return assignments.join("\n");
        }
        const ths = (stmt.lhs as VarNode).isInParam
          ? "outerThis"
          : "methodThis";
        let rhs = this.buildInGen(stmt.rhs, cont);
        // もしrhsの末尾に`getValue()`が無い時は、`getValue()`を付ける
        if (
          !/[=<>!]/.test(rhs) &&
          !rhs.includes("Decimal") &&
          !rhs.endsWith("getValue()")
        )
          rhs += ".getValue()";
        return [
          `                ${ths}.${
            (stmt.lhs as VarNode).name
          }.setValue(${rhs});`,
          `                console.log("${
            (stmt.lhs as VarNode).name
          }: ", ${ths}.${(stmt.lhs as VarNode).name}.getValue());`,
        ].join("\n");
      }
      case "return": {
        return `                return ${this.buildInGen(stmt.value, cont)};`;
      }
      case "call": {
        // stmt.inputとstmt.outputを結合してVarNode[]に変換
        const input = (stmt.input as StructNode).member.map(
          (v) => v.value as VarNode
        );
        const output = (stmt.output as StructNode).member.map(
          (v) => v.value as VarNode
        );
        const vList = input.concat(output);
        const setup = [
          `                const p: Predicate = new ${
            stmt.module.charAt(0).toUpperCase() + stmt.module.slice(1)
          }Class (`,
          vList
            .map(
              (v) =>
                `                  ${this.primaryGen(v, { isVarRef: true })},`
            )
            .join("\n"),
          `                  ${cont}`,
          "                );",
        ];
        const run = [
          // "                for (let s: boolean = vm.call(p); s === true; s = vm.redo()) {",
          // "                  vm.setChoicePoint(p);",
          // "                }",
          // "                vm.setChoicePoint(p);",
          "                return p;",
        ];
        return [...setup, ...run].join("\n");
      }
      default:
        return "";
    }
  }

  private buildInGen(buildIn: BuildInNode, cont: string | undefined): string {
    switch (buildIn.type) {
      case "for": {
        return [
          "new For(",
          buildIn.target
            ? this.primaryGen(buildIn.target, { isVarRef: true })
            : "",
          ", ",
          ...this.exprGen(buildIn.from, { isVarRef: true }),
          ", ",
          ...this.exprGen(buildIn.to, { isVarRef: true }),
          ", ",
          ...this.exprGen(buildIn.inc, { isVarRef: true }),
          ", ",
          cont,
          ")",
        ].join("");
      }
      case "select": {
        return [
          "new Member(",
          buildIn.target
            ? this.primaryGen(buildIn.target, { isVarRef: true })
            : "",
          ", ",
          ...this.exprGen(buildIn.list, { isVarRef: true }),
          ", ",
          cont,
          ")",
        ].join("");
      }
      case "case": {
        const target = buildIn.target
          ? this.primaryGen(buildIn.target, { isVarRef: true })
          : "";
        const cond = this.exprGen(buildIn.cond, {
          isVarRef: false,
          isString: false,
        });
        const thn = this.exprGen(buildIn.thn, {
          isVarRef: false,
          isString: false,
        });
        const els = buildIn.else
          ? buildIn.else.map((e) => ({
              cond: this.exprGen(e.cond, {
                isVarRef: false,
                isString: false,
              }),
              thn: this.exprGen(e.thn, {
                isVarRef: false,
                isString: false,
              }),
            }))
          : [];
        return [
          `new Case(${target}, [{ cond: ${cond}, expr: ${thn} }, ${
            els.length === 0
              ? ""
              : els.map((e) => `{ cond: ${e.cond}, expr: ${e.thn}}`).join(", ")
          }]`,
          `, ${cont})`,
        ].join("");
      }
      default:
        return this.exprGen(buildIn, { isVarRef: false, isString: false });
    }
  }

  private _wrapCalc(expr: Expr, primaryOP: ExprGenOptions): string {
    const exprStr = this.exprGen(expr, primaryOP);
    const wrapped =
      expr.type === "call-expr"
        ? `(${exprStr})`
        : expr.type === "num"
        ? `new Decimal('${exprStr}')`
        : expr.type === "var"
        ? `new Decimal(${exprStr})`
        : expr.type === "nth" ||
          expr.type === "length" ||
          expr.type === "list-sum"
        ? `new Decimal(${exprStr}.toString())`
        : exprStr;
    return wrapped;
  }

  private exprGen(expr: Expr, primaryOP: ExprGenOptions): string {
    if (expr.type === "call-expr") {
      const l = this.exprGen(expr.lhs, primaryOP);
      const lhsStr = expr.lhs.type === "call-expr" ? `(${l})` : l;

      const lhsStrForCalc = this._wrapCalc(expr.lhs, primaryOP);
      switch (expr.callee) {
        case "add": {
          const rhsStr = this._wrapCalc(expr.rhs, primaryOP);
          return `${lhsStrForCalc}.plus(${rhsStr})`;
        }
        case "sub": {
          const rhsStr = this._wrapCalc(expr.rhs, primaryOP);
          return `${lhsStrForCalc}.minus(${rhsStr})`;
        }
        case "mul": {
          const rhsStr = this._wrapCalc(expr.rhs, primaryOP);
          return `${lhsStrForCalc}.times(${rhsStr})`;
        }
        case "div": {
          const rhsStr = this._wrapCalc(expr.rhs, primaryOP);
          return `${lhsStrForCalc}.dividedBy(${rhsStr})`;
        }
        case "mod": {
          const rhsStr = this._wrapCalc(expr.rhs, primaryOP);
          return `${lhsStrForCalc}.mod(${rhsStr})`;
        }
        case "pow": {
          const rhsStr = this._wrapCalc(expr.rhs, primaryOP);
          return `${lhsStrForCalc}.pow(${rhsStr})`;
        }
        case "EQ": {
          const rhs = this.exprGen(expr.rhs, primaryOP);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} === ${rhsStr}`;
        }
        case "NE": {
          const rhs = this.exprGen(expr.rhs, primaryOP);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} !== ${rhsStr}`;
        }
        case "LT": {
          const rhs = this.exprGen(expr.rhs, primaryOP);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} < ${rhsStr}`;
        }
        case "LE": {
          const rhs = this.exprGen(expr.rhs, primaryOP);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} <= ${rhsStr}`;
        }
        case "and": {
          const rhs = this.exprGen(expr.rhs, primaryOP);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} && ${rhsStr}`;
        }
        case "or": {
          const rhs = this.exprGen(expr.rhs, primaryOP);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} || ${rhsStr}`;
        }
        case "not":
          return `!${lhsStr}`;
        case "neg":
          return `new Decimal('${lhsStr}').neg()`;
        default:
          return "";
      }
    }
    return this.primaryGen(expr, primaryOP);
  }

  private primaryGen(primary: Expr, option: ExprGenOptions): string {
    switch (primary.type) {
      case "num":
        return `${primary.token.value}`;
      case "string":
        return `'${primary.token.value}'`;
      case "boolean":
        return primary.token.value === "true" ? "true" : "false";
      case "list": {
        const member = primary.member.map((m) =>
          this.primaryGen(m, { isVarRef: false, isString: false })
        );
        return ["[", ...member, "]"].join("\n");
      }
      case "var": {
        const ths = primary.isInParam ? "outerThis" : "methodThis";
        let value = "";
        if (option.isVarRef) {
          value = `${ths}.${primary.name}`;
        } else {
          value = option.isString
            ? `${ths}.${primary.name}.toString()`
            : `${ths}.${primary.name}.getValue()`;
        }
        return value;
      }
      case "sqrt": {
        return [
          "Decimal.sqrt(",
          ...this.exprGen(primary.expr, option),
          ")",
        ].join("");
      }
      case "exp": {
        return [
          "Decimal.exp(",
          ...this.exprGen(primary.expr, option),
          ")",
        ].join("");
      }
      case "length": {
        return [
          this.primaryGen(primary.list, { isVarRef: true }),
          ".getLength()",
        ].join("");
      }
      case "nth": {
        return [
          this.primaryGen(primary.list, { isVarRef: true }),
          ".getByIndex(",
          ...this.exprGen(primary.index, { isVarRef: false, isString: false }),
          ")",
        ].join("");
      }
      case "list-sum": {
        return [
          this.primaryGen(primary.list, { isVarRef: true }),
          ".getSum()",
        ].join("");
      }
      case "call-expr": {
        //?なくてもできたのなぜ？
        return this.exprGen(primary, option);
      }
      case "object": {
        const member = primary.member.map((m, i) => {
          const v = this.primaryGen(m.value, {
            isVarRef: false,
            isString: false,
          });
          return `  ${i + 1}: ${v},`;
        });
        return ["{", ...member, "}"].join("\n");
      }
      default:
        return "";
    }
  }
}

type ExprGenOptions =
  | { isVarRef: true } // この場合、isVarRefは不要
  | { isVarRef: false; isString: boolean };

export const codeGen = (prog: Program) => {
  const generator = new CodeGenerator(prog);
  return generator.generate();
};
