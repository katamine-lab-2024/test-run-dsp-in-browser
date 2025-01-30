import { NODE_TYPE } from "./constant";
import type { Expr, StmtBlock, StmtNode, VarNode } from "./types/ast";

// Helper: Collect variables used in an expression
const collectVariables = (
  node: Expr,
  filterFn: (v: VarNode) => boolean = () => true
): VarNode[] => {
  const vars: VarNode[] = [];
  const traverse = (n: Expr) => {
    if (n.type === NODE_TYPE.VAR && filterFn(n)) vars.push(n);
    if ("lhs" in n) traverse(n.lhs);
    if ("rhs" in n) traverse(n.rhs);
  };
  traverse(node);
  vars.filter((v, i, self) => self.findIndex((s) => s.name === v.name) === i);
  return vars;
};

// Classify statements into categories
const classifyStatements = (
  stmt: StmtNode[]
): Record<string, StmtBlock[]> | null => {
  const categories = { assume: [], calc: [], test: [] } as Record<
    string,
    StmtBlock[]
  >;

  for (const s of stmt) {
    if (s.type === "dummy") return null;

    const { stmt: innerStmt } = s;

    if (innerStmt.type === NODE_TYPE.ASSIGN) {
      if (
        innerStmt.rhs.type === NODE_TYPE.FOR ||
        innerStmt.rhs.type === NODE_TYPE.SELECT
      ) {
        categories.assume.push({
          type: "stmt-block",
          token: s.token,
          body: [s],
          phase: "assume",
          target: innerStmt.lhs as VarNode,
        });
      } else if (!innerStmt.lhs.token.value.includes("constraint")) {
        const operands: VarNode[] = [];
        if (innerStmt.rhs.type === NODE_TYPE.CALL_EXPR)
          operands.push(...collectVariables(innerStmt.rhs, (v) => !v.isInput));
        if (innerStmt.rhs.type === NODE_TYPE.SQRT)
          operands.push(
            ...collectVariables(innerStmt.rhs.expr, (v) => !v.isInput)
          );
        categories.calc.push({
          type: "stmt-block",
          token: s.token,
          body: [s],
          phase: "calc",
          target: innerStmt.lhs as VarNode,
          operand: operands,
        });
      } else {
        const vars = collectVariables(innerStmt.rhs as Expr);
        const target = vars.find((v) => !v.isInput) ?? vars[0];
        const operand = vars.filter((v) => v !== target);
        categories.test.push({
          type: "stmt-block",
          token: s.token,
          body: [s],
          phase: "test",
          target: target,
          operand: operand,
        });
      }
    } else if (innerStmt.type === NODE_TYPE.TEST) {
      const vars = collectVariables(innerStmt.cond as Expr);
      const target = vars.find((v) => !v.isInput) ?? vars[0];
      const operand = vars.filter((v) => v !== target);
      categories.test.push({
        type: "stmt-block",
        token: s.token,
        body: [s],
        phase: "test",
        target: target,
        operand: operand,
      });
    }
  }

  return Object.values(categories).some((list) => list.length > 0)
    ? categories
    : null;
};

// Resolve dependencies recursively
const resolveDependencies = (
  stmt: StmtBlock,
  sorted: Set<StmtBlock>,
  assumeList: StmtBlock[],
  otherCalc: StmtBlock[]
): void => {
  // 未解決のオペランドを取得
  const unresolved = stmt.operand?.filter(
    (op) => !Array.from(sorted).some((s) => s.target.name === op.name)
  );

  if (unresolved?.length) {
    for (const dep of unresolved) {
      // assume の解決
      const assume = assumeList.find((a) => a.target.name === dep.name);
      if (assume && !sorted.has(assume))
        resolveDependencies(assume, sorted, assumeList, otherCalc);

      // calc の解決
      const calc = otherCalc.find((c) => c.target.name === dep.name);
      if (calc && !sorted.has(calc))
        resolveDependencies(calc, sorted, assumeList, otherCalc);
    }
  }

  // assume を先に追加
  if (stmt.phase === "assume" && !sorted.has(stmt)) {
    sorted.add(stmt);
    return;
  }

  // calc または test を追加
  if (!sorted.has(stmt)) {
    sorted.add(stmt);
  }
};

// Merge and sort blocks
const mergeBlocks = (
  assumeList: StmtBlock[],
  testCalc: StmtBlock[],
  otherCalc: StmtBlock[],
  testList: StmtBlock[]
): StmtBlock[] => {
  const sorted = new Set<StmtBlock>();

  // Resolve dependencies for testCalc
  for (const calc of testCalc) {
    resolveDependencies(calc, sorted, assumeList, otherCalc);
    const test = testList.find((t) => t.target.name === calc.target.name);
    if (test) resolveDependencies(test, sorted, assumeList, otherCalc);
  }

  // Resolve dependencies for otherCalc
  for (const calc of otherCalc) {
    resolveDependencies(calc, sorted, assumeList, otherCalc);
  }

  // Add remaining assumes
  for (const assume of assumeList) {
    if (!sorted.has(assume))
      resolveDependencies(assume, sorted, assumeList, otherCalc);
  }

  return Array.from(sorted);
};

const margeCalcTest = (sorted: StmtBlock[]) => {
  let i = 0;
  // まず、testとその前に続くcalcを結合
  while (i < sorted.length) {
    const s = sorted[i];
    if (s.phase !== "test") {
      i++;
      continue;
    }
    // testの要素を見つけたので、1つずつ前に戻る
    let j = i - 1;
    let merged = s;
    while (j >= 0) {
      const c = sorted[j];
      if (c.phase === "calc") {
        const body = c.body.concat(merged.body);
        sorted.splice(j + 1, 1);
        merged = { ...c, body };
        // 現在の位置(j)で上書き
        sorted[j] = { ...merged };
      } else {
        j++;
        break;
      }
      j--;
    }
    // 次の要素で結合対象にならないように、結合したphaseをtestに変更
    sorted[j] = { ...merged, phase: "test" };
    // sortedの長さが変わった分、インデックスを調整
    i = j + 1;
  }
  // 次に、calcが連続する場合は結合
  i = 0;
  while (i < sorted.length) {
    const s = sorted[i];
    if (s.phase !== "calc") {
      i++;
      continue;
    }
    // calcの要素を見つけたので、1つずつ前に戻る
    let j = i - 1;
    let merged = s;
    while (j >= 0) {
      const c = sorted[j];
      if (c.phase === "calc") {
        const body = c.body.concat(merged.body);
        sorted.splice(j + 1, 1);
        merged = { ...c, body };
        // 現在の位置(j)で上書き
        sorted[j] = { ...merged };
      } else {
        j++;
        break;
      }
      j--;
    }
    // 次の要素で結合対象にならないように、結合したphaseをcalcに変更
    sorted[j] = { ...merged, phase: "calc" };
    // sortedの長さが変わった分、インデックスを調整
    i = j + 1;
  }
  return sorted;
};

// Main function to sort statements
export const sortStmt = (predicates: StmtNode[]): StmtBlock[] => {
  const stmtList = classifyStatements(predicates);
  if (!stmtList) throw new Error("No valid statements to process.");

  const { assume, calc, test } = stmtList;

  const testCalc = test.map((t) =>
    calc.find((c) => c.target.name === t.target.name)
  ) as StmtBlock[];
  const otherCalc = calc.filter((c) => !testCalc.includes(c));

  const sorted = mergeBlocks(assume, testCalc, otherCalc, test);
  return margeCalcTest(sorted);
};
