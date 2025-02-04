import { tokenize } from "./lexer";
import { parser } from "./parser";
import { getUserInput, setFilename, setUserInput, reportError } from "./utils";
import type { CompileError } from "./types/error";
import { converter } from "./converter";
import { codeGen } from "./codeGen";

/**
 * エラーリスト
 */
const errorList: CompileError[] = [];

/**
 * コンパイル
 * @param args
 */
const compile = (
  filename: string,
  input: string
): {
  output: string;
  props: {
    input: {
      name: string;
      type: string;
    }[];
    output: {
      name: string;
      type: string;
    }[];
  };
} => {
  // ファイル名を格納
  setFilename(filename);
  // ファイル読み込み
  // const input = fs.readFileSync(filename, "utf-8");
  setUserInput(input);
  // 字句解析
  const tokenized = tokenize(getUserInput());
  if (tokenized.errorList.length > 0) {
    errorList.push(...tokenized.errorList);
    throw new Error("字句解析エラー");
  }
  // 構文解析
  const ast = parser(tokenized.tokenList);
  if (ast.errorList.length > 0) {
    errorList.push(...ast.errorList);
    throw new Error("構文解析エラー");
  }
  // 変換
  const newAst = converter(ast.program);
  // newAstから、クラスのfieldのvarをすべて取得
  let props: {
    input: {
      name: string;
      type: string;
    }[];
    output: {
      name: string;
      type: string;
    }[];
  } = {
    input: [],
    output: [],
  };
  const varList = newAst.body
    .filter((cls) => cls.type !== "dummy")
    .flatMap((c) => c.fieldList.filter((f) => f.type !== "dummy"))
    .flatMap((p) => p.value);
  props = {
    input: varList
      .filter((v) => v.isInput)
      .map((v) => ({
        name: v.name,
        type:
          v.valueType.type === "array"
            ? `${v.valueType.member[0].type}[]`
            : v.valueType.type === "object"
            ? `{${v.valueType.member
                .map((m, i) => `${i + 1}: ${m.type}`)
                .join(", ")}}`
            : v.valueType.type,
      })),
    output: varList
      .filter((v) => !v.isInput)
      .map((v) => ({ name: v.name, type: v.valueType.type })),
  };
  // コード生成
  const output = codeGen(newAst);
  return {
    output,
    props,
  };
};

/**
 * メイン関数
 * @param args
 */
export const compiler = (filename: string, input: string) => {
  try {
    return compile(filename, input);
  } catch (e) {
    reportError(errorList);
  }
};
