import { NEW_STRUCT_TYPE } from "./constant";
import type {
  BuildInNode,
  Class,
  Expr,
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
        ? `{${innerMemberType.map((m, i) => `${i}: ${m};`).join(" ")}}`
        : `List<{${innerMemberType.map((m, i) => m).join(" | ")}>`;
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
      'import { type IC, createInnerClass } from "./util";',
      'import { Predicate } from "./Predicate";',
      'import { Variable } from "./Variable";',
      'import { List } from "./List";',
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
      exec = [
        "  public exec(vm: VM): Predicate {",
        ...blockList.map(
          (block) => `    return new this.Method_${block.name}().exec(vm);`
        ),
        "  }",
        "",
      ];
    } else {
      // whenで条件分岐
      const anySuccess = [];
      const newP = [];
      const conds = [];
      for (const block of blockList) {
        if (block.when) {
          let cond = this.exprGen(block.when, false);
          if (cond.includes("outerThis")) {
            cond = cond.replaceAll("outerThis", "this");
          }
          conds.push(cond);
          newP.push(
            `    const method_${block.name} = new this.Method_${block.name}();`
          );
          anySuccess.push(
            `    if (${cond}) {
      return method_${block.name}.exec(vm);
    }\n`
          );
        }
      }
      // 全てのcondが失敗するか
      const allFail = [
        "    if(",
        ...conds.map((c) => `!(${c})`).join("\n      && "),
        ") {\n",
        "      return Predicate.failure;\n",
        "    }\n",
        "",
      ];
      // 全てのcondが成功するか
      const allSuccess = [
        "    if(",
        ...conds.map((c) => `(${c})`).join("\n      && "),
        ") {\n",
        // blockListの先頭以外をchoicePointに追加
        blockList
          .filter((b) => b !== blockList[0])
          .map((b) => {
            return `      vm.setChoicePoint(method_${b.name});\n`;
          }),
        // blockListの先頭を実行
        `      return method_${blockList[0].name}.exec(vm);\n`,
        "    }",
        "\n",
      ];
      exec = [
        "  public exec(vm: VM): Predicate {",
        newP.join("\n"),
        "",
        allFail.join(""),
        allSuccess.join(""),
        anySuccess.join(""),
        // "    return Predicate.failure;",
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
        const cond = this.exprGen(stmt.cond, false);
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
        const ths = (stmt.lhs as VarNode).isInParam
          ? "outerThis"
          : "methodThis";
        return [
          `                ${ths}.${
            (stmt.lhs as VarNode).name
          }.setValue(${this.buildInGen(stmt.rhs, cont)});`,
          // `                console.log("${
          //   (stmt.lhs as VarNode).name
          // }: ", ${ths}.${(stmt.lhs as VarNode).name}.getValue());`,
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
            .map((v) => `                  ${this.primaryGen(v, true)},`)
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
          buildIn.target ? this.primaryGen(buildIn.target, true) : "",
          ", ",
          ...this.exprGen(buildIn.from, true),
          ", ",
          ...this.exprGen(buildIn.to, true),
          ", ",
          ...this.exprGen(buildIn.inc, true),
          ", ",
          cont,
          ")",
        ].join("");
      }
      case "select": {
        return [
          "new Member(",
          buildIn.target ? this.primaryGen(buildIn.target, true) : "",
          ", ",
          ...this.exprGen(buildIn.list, true),
          ", ",
          cont,
          ")",
        ].join("");
      }
      default:
        return this.exprGen(buildIn, false);
    }
  }

  private exprGen(expr: Expr, isVarRef: boolean): string {
    if (expr.type === "call-expr") {
      const lhs = this.exprGen(expr.lhs, false);
      const lhsStr = expr.lhs.type === "call-expr" ? `(${lhs})` : lhs;
      switch (expr.callee) {
        case "add": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} + ${rhsStr}`;
        }
        case "sub": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} - ${rhsStr}`;
        }
        case "mul": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} * ${rhsStr}`;
        }
        case "div": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} / ${rhsStr}`;
        }
        case "mod": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} % ${rhsStr}`;
        }
        case "pow": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} ** ${rhsStr}`;
        }
        case "EQ": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} === ${rhsStr}`;
        }
        case "NE": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} !== ${rhsStr}`;
        }
        case "LT": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} < ${rhsStr}`;
        }
        case "LE": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} <= ${rhsStr}`;
        }
        case "and": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} && ${rhsStr}`;
        }
        case "or": {
          const rhs = this.exprGen(expr.rhs, false);
          const rhsStr = expr.rhs.type === "call-expr" ? `(${rhs})` : rhs;
          return `${lhsStr} || ${rhsStr}`;
        }
        case "not":
          return `!${lhsStr}`;
        case "neg":
          return `-${lhsStr}`;
        default:
          return "";
      }
    }
    return this.primaryGen(expr, isVarRef);
  }

  private primaryGen(primary: Expr, isVarRef: boolean): string {
    switch (primary.type) {
      case "num":
        return primary.token.value;
      case "string":
        return primary.token.value;
      case "boolean":
        return primary.token.value;
      case "var": {
        const ths = primary.isInParam ? "outerThis" : "methodThis";
        // const type = primary.valueType;
        const getMethod = "getValue";
        // if (type.type === "number") {
        //   getMethod = "getNumberValue";
        // } else if (type.type === "string") {
        //   getMethod = "getStringValue";
        // }
        return isVarRef
          ? `${ths}.${primary.name}`
          : `${ths}.${primary.name}.${getMethod}()`;
      }
      case "sqrt": {
        return ["Math.sqrt(", ...this.exprGen(primary.expr, false), ")"].join(
          ""
        );
      }
      case "exp": {
        return ["Math.exp(", ...this.exprGen(primary.expr, false), ")"].join(
          ""
        );
      }
      default:
        return "";
    }
  }
}

export const codeGen = (prog: Program) => {
  const generator = new CodeGenerator(prog);
  return generator.generate();
};
