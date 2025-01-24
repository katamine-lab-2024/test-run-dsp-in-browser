import type {
  BuildInNode,
  Class,
  Expr,
  Program,
  StmtNode,
  VarNode,
} from "./types/newAst";

class CodeGenerator {
  private prog: Program;
  private output: string[] = [];

  constructor(prog: Program) {
    this.prog = prog;
  }

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
      'import { Test } from "./Test";',
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
            ...inputField.map((f) => `  _${f.name}: ${f.valueType.type};`),
            "}",
          ]
        : [];
    const decl = ["export const main = (", ...inputDecl, ") => {"];
    const setup = [
      "const vm: VM = new VM();",
      ...fieldList.map(
        (f) =>
          `const _${f.name}: Variable = new Variable(${
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
      }(${fieldList.map((f) => `_${f.name}`).join(", ")}, Predicate.success);`,
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
        .map(
          (f) =>
            `    ${f.name}: _${f.name}.${
              f.valueType.type === "number"
                ? "getNumberValue"
                : f.valueType.type === "string"
                ? "getStringValue"
                : "getValue"
            }(),`
        ),
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
    } implements Predicate {`;

    const field = [
      ...module.fieldList
        .filter((p) => p.type !== "dummy")
        .flatMap((p) => p.value.map((v) => `  private ${v.name}: Variable;`)),
      "  private cont: Predicate;",
      "",
    ];

    const construct = [
      "  public constructor(",
      ...module.fieldList
        .filter((p) => p.type !== "dummy")
        .flatMap((p) => p.value.map((v) => `    ${v.name}: Variable,`)),
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

    const exec = [
      "  public exec(vm: VM): Predicate {",
      ...blockList.map(
        (block) => `    return new this.Method_${block.name}().exec(vm);`
      ),
      "  }",
      "",
    ];

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
            (v) => `        private ${v.name}: Variable = new Variable();`
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
        ...method.body.flatMap((stmt) =>
          [
            this.stmtGen(stmt, c),
            stmt === method.body[method.body.length - 1] &&
            stmt.type === "assign"
              ? `                return ${c};\n`
              : "",
          ].join("")
        )
      );
    }
    const exec = [
      "              public exec(vm: VM) {",
      ...execBodyContents,
      "              }",
    ];
    return [...classDecl, ...exec, "            }", "        );"];
  }

  private stmtGen(stmt: StmtNode, cont: string | undefined): string {
    switch (stmt.type) {
      case "if": {
        return [
          `                if (!(${this.exprGen(stmt.cond, false)})) {`,
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
        ].join("\n");
      }
      case "return": {
        return `                return ${this.buildInGen(stmt.value, cont)};`;
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
      case "sqrt": {
        return ["Math.sqrt(", ...this.exprGen(buildIn.expr, false), ")"].join(
          ""
        );
      }
      default:
        return this.exprGen(buildIn, false);
    }
  }

  private exprGen(expr: Expr, isVarRef: boolean): string {
    if (expr.type === "call-expr") {
      switch (expr.callee) {
        case "add":
          return `${this.exprGen(expr.lhs, false)} + ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "sub":
          return `${this.exprGen(expr.lhs, false)} - ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "mul":
          return `${this.exprGen(expr.lhs, false)} * ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "div":
          return `${this.exprGen(expr.lhs, false)} / ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "mod":
          return `${this.exprGen(expr.lhs, false)} % ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "pow":
          return `${this.exprGen(expr.lhs, false)} ** ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "EQ":
          return `${this.exprGen(expr.lhs, false)} === ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "NE":
          return `${this.exprGen(expr.lhs, false)} !== ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "LT":
          return `${this.exprGen(expr.lhs, false)} < ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "LE":
          return `${this.exprGen(expr.lhs, false)} <= ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "and":
          return `${this.exprGen(expr.lhs, false)} && ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "or":
          return `${this.exprGen(expr.lhs, false)} || ${this.exprGen(
            expr.rhs,
            false
          )}`;
        case "not":
          return `!${this.exprGen(expr.lhs, false)}`;
        case "neg":
          return `-${this.exprGen(expr.lhs, false)}`;
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
        const type = primary.valueType;
        let getMethod = "getValue";
        if (type.type === "number") {
          getMethod = "getNumberValue";
        } else if (type.type === "string") {
          getMethod = "getStringValue";
        }
        return isVarRef
          ? `${ths}.${primary.name}`
          : `${ths}.${primary.name}.${getMethod}()`;
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
