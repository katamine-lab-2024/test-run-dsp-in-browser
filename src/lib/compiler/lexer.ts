import type { CompileError } from "./types/error";
import type { Token, TokenType } from "./types/token";
import { TOKEN_TYPE } from "./constant";

// 字句解析の結果
type LexerResult = {
  errorList: CompileError[];
  tokenList: Token[];
};

/**
 * 字句解析器
 * @class Lexer
 * @method {LexerResult} exec 字句解析を実行
 */
class Lexer {
  /** 入力: ファイル内容 */
  input: string[] = [];
  /** 現在の文字の位置 */
  current = 0;
  /** 現在の行番号 */
  line = 1;
  /** 行番号における文字の位置 */
  character = 1;
  /** 出力: エラーリスト */
  errorList: CompileError[] = [];
  /** 出力: 処理結果のトークンリスト */
  tokenList: Token[] = [];

  /**
   * 現在の文字を取得
   * @returns {string} 現在の文字
   */
  getChar(): string {
    return this.input[this.current] || "";
  }

  /**
   * 現在の文字を消費して返す
   * @returns {string} 現在の文字
   */
  consumeChar(): string {
    return this.input[this.current++];
  }

  /**
   * トークンを生成
   * @param {TokenType} type トークンの種類
   * @param {string} val トークンの値
   * @returns {Token} 生成したトークン
   */
  newToken(type: TokenType, val: string): Token {
    const pos = { line: this.line, character: this.character };
    this.character += val.length;
    return { type: type, position: pos, value: val };
  }

  /**
   * 予約語と一致するか判定し、一致した場合はその予約語を返す
   * @param {readonly string[]} keywordList 予約語リスト
   * @returns {string | null} 一致すれば予約語、一致しなければnull
   */
  getReserved(keywordList: readonly string[]): string | null {
    let s: string[] = [];
    for (const keyword of keywordList) {
      s = this.input.slice(this.current, this.current + keyword.length);
      if (s.join("") === keyword) {
        return keyword;
      }
    }
    return null;
  }

  /**
   * 正規表現に一致する文字列を取得
   * @param {RegExp} re 正規表現
   * @returns {string} 一致した文字列
   */
  accept(re: RegExp): string {
    let val = "";
    while (re.test(this.getChar())) {
      val += this.consumeChar();
    }
    return val;
  }

  /**
   * 字句解析を実行
   * @param {string[]} input ファイル内容
   * @returns {LexerResult} 字句解析の結果
   */
  exec(input: string[]): LexerResult {
    this.input = input;

    while (this.current < this.input.length) {
      // 改行があれば、行番号と文字位置を更新
      if (this.getChar() === "\n") {
        this.line++;
        this.character = 1;
        this.current++;
        continue;
      }

      // 空白文字をスキップ
      if (WHITESPACE.test(this.getChar())) {
        this.consumeChar();
        this.character++;
        continue;
      }

      // `%` から行末までをコメントとして扱う
      if (this.getChar() === "%") {
        while (this.getChar() !== "\n") {
          this.consumeChar();
        }
        continue;
      }

      // 予約語
      const reserved = this.getReserved([...KEYWORDS, ...OPT]);
      if (reserved) {
        this.tokenList.push(this.newToken(TOKEN_TYPE.RESERVED, reserved));
        this.current += reserved.length;
        continue;
      }

      // 1文字
      const singleLetter = this.getReserved(SINGLE_LETTER);
      if (singleLetter) {
        this.tokenList.push(this.newToken(TOKEN_TYPE.RESERVED, this.getChar()));
        this.current++;
        continue;
      }

      // 変数
      if (/[A-Z_]/.test(this.getChar())) {
        const val = this.accept(VARIABLE_NAME);
        this.tokenList.push(this.newToken(TOKEN_TYPE.IDENT_VAR, val));
        continue;
      }

      // 識別子(関数名またはatom)
      if (IDENTIFIER.test(this.getChar())) {
        const val = this.accept(IDENT_NUM);
        if (this.getChar() === "(" || this.input[this.current + 1] === "(") {
          this.tokenList.push(this.newToken(TOKEN_TYPE.IDENT_FUNC, val));
          continue;
        }
        this.tokenList.push(this.newToken(TOKEN_TYPE.ATOM, val));
        continue;
      }

      // 数値(実数を含む)
      if (NUMBERS.test(this.getChar())) {
        const integerPart = this.accept(NUMBERS);
        let fractionalPart = "";
        if (this.getChar() === ".") {
          this.consumeChar();
          fractionalPart = `.${this.accept(NUMBERS)}`;
        }
        let exponentPart = "";
        if (/[eE]/.test(this.getChar())) {
          exponentPart += this.consumeChar(); // e または E
          if (/[+\-]/.test(this.getChar())) {
            exponentPart += this.consumeChar(); // + または -
          }
          exponentPart += this.accept(NUMBERS);
        }
        this.tokenList.push(
          this.newToken(
            TOKEN_TYPE.NUMBER,
            integerPart + fractionalPart + exponentPart
          )
        );
        continue;
      }

      // エラーリカバリ
      this.errorList.push({
        message: "Unexpected character.",
        position: { line: this.line, character: this.character },
      });
      this.current++;
      this.character++;
    }

    // EOF
    // ファイル末尾が改行で終わっている場合、EOFの位置を調整
    if (
      this.input[this.input.length] === undefined &&
      this.input[this.input.length - 1] === "\n"
    ) {
      const lastToken = this.tokenList[this.tokenList.length - 1];
      this.character = lastToken.position.character + 1;
    }
    this.tokenList.push(this.newToken(TOKEN_TYPE.EOF, ""));
    return {
      tokenList: this.tokenList,
      errorList: this.errorList,
    };
  }
}

/**
 ****** 正規表現 ******
 */

const WHITESPACE = /(\s|\t)/;
const IDENTIFIER = /[a-zA-Z_]/;
const IDENT_NUM = /[a-zA-Z0-9_]/;
const VARIABLE_NAME =
  /[a-zA-Z0-9_\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{Script=Greek}]/u;
const NUMBERS = /[0-9]/;

/**
 ****** 予約語 ******
 */

const KEYWORDS = [
  // bool
  "true",
  "falt",
  // 制御構文
  "method",
  "module",
  "end",
  // モジュール
  "select",
  "for",
  "case",
  "sqrt",
  "exp",
  "call",
  "when",
  "test",
  // 型
  "integer",
  "real",
  "atom",
  "bool",
  // method
  "length",
  "nth",
  "sum",
] as const;
const OPT = ["==", "\\=", "=<", ">=", "or", "and", "not", "mod", "->"] as const;
const SINGLE_LETTER = [
  "+",
  "-",
  "*",
  "/",
  "^",
  "(",
  ")",
  "<",
  ">",
  ";",
  ":",
  "=",
  "{",
  "}",
  "[",
  "]",
  ",",
  "[",
  "]",
  ".",
  '"',
  "i",
  "r",
  "a",
  "b",
] as const;

/**
 * 字句解析
 * @param {string[]} input ファイル内容
 * @returns {LexerResult} 字句解析の結果
 */
export const tokenize = (input: string[]): LexerResult => {
  const lexer = new Lexer();
  return lexer.exec(input);
};
