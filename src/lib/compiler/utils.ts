import type { CompileError } from "./types/error";
import type { NewInput } from "./types/input";

/**
 * ファイル名
 * @type string
 */
let filename: string;

/**
 * ファイル内容
 * @type string[]
 */
let userInput: string[];

/**
 * レポート用に変換したファイル内容
 * @type {NewInput}
 */
let inputForReport: NewInput;

/**
 * ファイル名のsetter
 * @param name {string} ファイル名
 * @returns {void}
 */
export const setFilename = (name: string): void => {
  filename = name;
};

/**
 * ファイル内容のgetter
 * @returns {string} ファイル名
 */
export const getUserInput = (): string[] => userInput;

/**
 * ファイル内容のsetter. \
 * 同時に、内容をレポート用に変換する
 * @param input {string} ファイル内容
 * @returns {void}
 */
export const setUserInput = (input: string): void => {
  // 改行コードを\nに統一し、タブをスペースに変換
  const l = input.replaceAll("\r\n", "\n").replaceAll("\t", " ");
  userInput = [...l];
  // レポート用に変換
  inputForReport = setLineNumber(userInput);
};

/**
 * ファイル内容を、1行ごとに行番号を付与した形に変換
 * @param input {string[]} ファイル内容
 * @returns {NewInput} レポート用に変換したファイル内容
 */
export const setLineNumber = (input: string[]): NewInput => {
  // 文字列の位置
  let current = 0;
  // 行番号
  let lNum = 0;
  // 1行分の文字列
  let lineContent: string[] = [];
  // レポート用に変換したファイル内容
  const newInput: NewInput = [];

  // 改行コードを見つけたら、lineContentをnewInputに追加
  while (current < input.length) {
    const cur = input[current];

    if (cur === "\n") {
      lNum++;
      newInput.push({
        num: lNum,
        content: lineContent.join(""),
      });
      // lineContentをリセット
      lineContent = [];
    } else {
      lineContent.push(cur);
    }
    current++;
  }

  return newInput;
};

const red = "\u001b[31m";
const reset = "\u001b[0m";

/**
 * エラー内容を出力する
 * @param errorList {CompileError[]} エラーを格納したリスト
 * @returns {void}
 */
export const reportError = (errorList: CompileError[]): void => {
  const prefix = `[${red}ERROR${reset}] `;
  const content: string[] = ["\n"];
  for (const e of errorList) {
    // エラーが発生した行の内容を取得
    const errorLine = inputForReport.find(
      (l) => l.num === e.position.line
    )?.content;

    const c = [
      prefix,
      `${filename}:${e.position.line}:${e.position.character} ${e.message}\n`,
      `${" ".repeat(4)}${errorLine}\n`,
      `${" ".repeat(3 + e.position.character)}^\n`,
      "\n",
    ];
    content.push(...c);
  }
  // 最後の改行を削除
  content.pop();
  console.error(content.join(""));
};
