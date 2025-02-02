import type {
  AssignNode,
  BlockNode,
  BuildInNode,
  CalcNode,
  Expr,
  Member,
  ModuleNode,
  ParamNode,
  Primary,
  Program,
  StmtExpr,
  StmtNode,
  StructNode,
  VarNode,
} from "./types/ast";
import type { CompileError } from "./types/error";
import type { Token, TokenType } from "./types/token";
import {
  NODE_TYPE,
  OP_TYPE,
  SIMPLE_TYPE,
  STRUCT_TYPE,
  TOKEN_TYPE,
} from "./constant";
import type { Type, TypeKind } from "./types/type";

// 構文解析の結果
type ParseResult = {
  errorList: CompileError[];
  program: Program;
};

// ローカル変数
type LocalVar = {
  // モジュール名や引数に渡されたモジュール名
  fname: string[];
  // 変数
  varList: VarNode[];
};

// スコープ
type Scope = {
  // module内のscope
  module: VarNode[];
  // block内のscope
  block: VarNode[];
};

/**
 * 構文解析器
 * @class Parser
 * @method {ParseResult} exec 構文解析を実行
 */
class Parser {
  /** 入力: トークンリスト */
  tokenList: Token[] = [];
  /** 現在見ているトークンのindex */
  current = 0;
  /** ローカル変数のリスト */
  localVarList: LocalVar = {
    fname: [],
    varList: [],
  };
  /** 変数のスコープ */
  scope: Scope = {
    module: [],
    block: [],
  };
  /** 出力: エラーリスト */
  errorList: CompileError[] = [];
  /** 出力: `Program` */
  program: ModuleNode[] = [];

  /**
   * 現在のトークンを取得
   * @returns {Token} 現在のトークン
   */
  peek(): Token {
    return this.tokenList[this.current];
  }

  /**
   * 次のトークンに進む
   * @returns {void}
   */
  next(): void {
    this.current++;
  }

  /**
   * 現在のトークンが、指定した内容であるか判定
   * @param {string | TokenType} c 比較対象
   * @returns {boolean} 一致した場合はtrue
   */
  isCurrent(c: string | TokenType): boolean {
    const cur = this.peek();
    if (Object.values(TOKEN_TYPE).includes(c as TokenType)) {
      return cur.type === c;
    }
    return cur.value === c;
  }

  /**
   * 現在のトークンが、指定した内容でない場合にエラーを追加
   * @param {string | TokenType} c 比較対象
   * @returns {void}
   */
  expect(c: string | TokenType): void {
    if (!this.isCurrent(c)) {
      const cur = this.peek();
      this.errorList.push({
        message: `Expected ${c}, but got ${
          typeof c === "string" ? JSON.stringify(cur.value) : cur.type
        }`,
        position: cur.position,
      });
    }
  }

  /**
   * 現在のトークンを消費し、次のトークンを返す
   * @param {string | TokenType} c 消費対象
   * @returns {Token} 消費したトークン
   */
  consume(c: string | TokenType): Token {
    this.expect(c);
    const cur = this.peek();
    this.next();
    return cur;
  }

  /**
   * `scope`から変数を探し、見つかった場合はその変数を返す
   * @param {Token} tok トークン
   * @returns {VarNode | null} 変数
   */
  findVar(tok: Token): VarNode | null {
    const s = [...this.scope.module, ...this.scope.block];
    for (const v of s) {
      if (v.name === tok.value) {
        return v;
      }
    }
    // 有無を確認するためNULLを返す
    return null;
  }

  /**
   * `localList`や`scope`に変数を追加し、その変数を返す
   * @param {Token} tok トークン
   * @param {Type} ty 変数の型
   * @param {boolean} isBlock ブロックスコープかどうか
   * @returns {VarNode} 追加した変数
   */
  pushVar(tok: Token, ty: Type, isBlock: boolean, isInput = false): VarNode {
    // 既に定義されていたら、型検査をして返す
    const fv = this.findVar(tok);
    if (fv) {
      //typeがdummyの時はスルー(仮)
      if (fv.valueType.type !== ty.type) {
        this.errorList.push({
          message: `Variable ${JSON.stringify(
            tok.value
          )} is already defined as ${fv.valueType.type}.`,
          position: ty.token.position,
        });
        return {
          type: NODE_TYPE.VAR,
          name: "dummy",
          token: tok,
          valueType: {
            type: "dummy",
            token: tok,
          },
          isInput: fv.isInput,
        };
      }
      return fv;
    }
    const v: VarNode = {
      type: NODE_TYPE.VAR,
      name: tok.value,
      valueType: ty,
      token: tok,
      isInput: isInput,
    };
    this.localVarList.varList.push(v);
    if (isBlock) {
      this.scope.block.push(v);
    } else {
      this.scope.module.push(v);
    }
    return v;
  }

  /**
   * 構文解析を実行
   * @param {Token[]} tokens 入力トークンリスト
   * @returns {ParseResult} 構文解析の結果
   */
  exec(tokens: Token[]): ParseResult {
    this.tokenList = tokens;
    while (!this.isCurrent(TOKEN_TYPE.EOF)) {
      this.program.push(this.parseModule());
    }
    return {
      errorList: this.errorList,
      program: {
        type: NODE_TYPE.PROGRAM,
        body: this.program,
      },
    };
  }

  /**
   * 単純変数の型名かどうか判定
   * @returns {TypeKind | null} 単純変数の型名
   */
  isSimpleTypeName(): TypeKind | null {
    const abbreviationMap: { [key: string]: TypeKind } = {
      i: SIMPLE_TYPE.INTEGER,
      r: SIMPLE_TYPE.REAL,
      b: SIMPLE_TYPE.BOOL,
      a: SIMPLE_TYPE.ATOM,
    };
    for (const t of Object.values(SIMPLE_TYPE)) {
      if (this.isCurrent(t)) return t;
    }
    for (const [k, v] of Object.entries(abbreviationMap)) {
      if (this.isCurrent(k)) return v;
    }
    return null;
  }

  /**
   * 型名を解析
   * @returns {Type} 型
   */
  parseType(): Type {
    const tok = this.peek();
    const s = this.isSimpleTypeName();
    // 単純変数
    if (s) {
      this.next();
      return {
        type: s,
        token: tok,
      };
    }
    // リスト
    if (this.isCurrent("[")) {
      this.next();
      const member: Type[] = [];
      if (
        this.isSimpleTypeName() ||
        this.isCurrent("[") ||
        this.isCurrent("{")
      ) {
        member.push(this.parseType());
        while (this.isCurrent(",")) {
          this.next();
          member.push(this.parseType());
        }
      }
      this.consume("]");
      return {
        type: STRUCT_TYPE.LIST,
        member: member,
        token: tok,
      };
    }
    // ベクトル
    if (this.isCurrent("{")) {
      this.next();
      const member: Type[] = [];
      if (
        this.isSimpleTypeName() ||
        this.isCurrent("[") ||
        this.isCurrent("{")
      ) {
        member.push(this.parseType());
        while (this.isCurrent(",")) {
          this.next();
          member.push(this.parseType());
        }
      }
      this.consume("}");
      return {
        type: STRUCT_TYPE.VECTOR,
        member: member,
        token: tok,
      };
    }
    // エラー
    this.errorList.push({
      message: `Expected type, but got ${JSON.stringify(tok.value)}.`,
      position: tok.position,
    });
    this.next();
    return {
      type: "dummy",
      token: tok,
    };
  }

  /**
   * `module = ident-func params *block "end" "module" ";"`
   * @returns {ModuleNode} モジュールノード
   */
  parseModule(): ModuleNode {
    this.localVarList = {
      fname: [],
      varList: [],
    };
    this.scope = {
      module: [],
      block: [],
    };
    const tok = this.peek();
    let name: string;
    if (
      this.isCurrent(TOKEN_TYPE.IDENT_FUNC) ||
      this.isCurrent(TOKEN_TYPE.RESERVED)
    ) {
      name = tok.value;
      this.localVarList.fname.push(name);
    } else {
      this.errorList.push({
        message: `Expected module name, but got ${JSON.stringify(tok.value)}.`,
        position: tok.position,
      });
      name = "dummy";
    }
    this.next();
    const params = this.parseParams();
    const block: BlockNode[] = [];
    while (!this.isCurrent("end")) {
      block.push(this.parseBlock());
    }
    this.next();
    if (this.isCurrent("module")) {
      this.next();
    }
    this.consume(";");
    return {
      type: NODE_TYPE.MODULE,
      token: tok,
      name: name,
      paramList: params,
      body: block,
      localList: this.localVarList.varList,
    };
  }

  private paramMemberIndex = -1;

  /**
   * `params = "(" ?( param *("," param)) ")"`
   * @returns {ParamNode[]} 引数リスト
   */
  parseParams(): ParamNode[] {
    this.consume("(");
    const params: ParamNode[] = [];
    if (!this.isCurrent(")")) {
      params.push(this.parseParam());
      while (this.isCurrent(",")) {
        this.next();
        params.push(this.parseParam());
      }
    }
    this.next();
    return params;
  }

  /**
   * `param = atom | vector`
   * @returns {ParamNode} 引数
   */
  parseParam(): ParamNode {
    const tok = this.peek();
    // ここのatomはモジュール名
    if (this.isCurrent(TOKEN_TYPE.ATOM)) {
      this.next();
      this.localVarList.fname.push(tok.value);
      return {
        type: NODE_TYPE.PARAM,
        token: tok,
        value: {
          type: NODE_TYPE.ATOM,
          token: tok,
        },
      };
    }
    if (this.isCurrent("{")) {
      this.paramMemberIndex++;
      const vector = this.parsePrimary();
      if (vector.type !== NODE_TYPE.VECTOR) {
        this.errorList.push({
          message: `Expected vector parameter, but got ${JSON.stringify(
            tok.value
          )}.`,
          position: tok.position,
        });
        return {
          type: NODE_TYPE.DUMMY,
          token: tok,
        };
      }
      // memberをpushVar
      for (const m of vector.member) {
        if (m.type === NODE_TYPE.MEMBER) {
          const ty: Type =
            m.value.type === NODE_TYPE.VAR
              ? m.value.valueType
              : {
                  type: "dummy",
                  token: m.token,
                };
          const isInput = this.paramMemberIndex === 0;
          if (isInput) {
            if (m.value.type === NODE_TYPE.VAR) {
              (m.value as VarNode).isInput = true;
            }
          }
          this.pushVar(m.token, ty, false, isInput);
        }
      }
      return {
        type: NODE_TYPE.PARAM,
        token: tok,
        value: vector.member,
      };
    }
    this.errorList.push({
      message: `Expected parameter, but got ${JSON.stringify(tok.value)}.`,
      position: tok.position,
    });
    return {
      type: NODE_TYPE.DUMMY,
      token: tok,
    };
  }

  /**
   * `block = "method" *stmt "end" "method" ";"`
   * @returns {BlockNode} ブロックノード
   */
  parseBlock(): BlockNode {
    const tok = this.peek();
    this.expect("method");
    this.scope.block = [];
    const stmt: StmtNode[] = [];
    this.next();
    while (!this.isCurrent("end")) {
      stmt.push(this.parseStmt());
    }
    this.next();
    this.consume("method");
    if (!this.isCurrent(";")) {
      const cur = this.peek();
      if (this.isCurrent(TOKEN_TYPE.EOF)) {
        this.errorList.push({
          message: `Expected ;, but got ${JSON.stringify(cur.value)}.`,
          position: {
            line: cur.position.line - 1,
            character: cur.position.character,
          },
        });
        return {
          type: NODE_TYPE.DUMMY,
          token: cur,
        };
      }
      this.errorList.push({
        message: `Expected ;, but got ${JSON.stringify(cur.value)}.`,
        position: cur.position,
      });
      this.next();
      return {
        type: NODE_TYPE.DUMMY,
        token: cur,
      };
    }
    this.next();
    const bs = this.scope.block;
    this.scope.block = [];
    // stmtの初めにwhenNodeがあれば、取得
    const s0 = stmt.filter((s) => s.type !== "dummy")[0].stmt;
    const whenNode = s0.type === "when" ? s0.cond : undefined;
    // 条件を取得できたら、stmtから削除
    if (whenNode) {
      stmt.shift();
    }
    return {
      type: NODE_TYPE.BLOCK,
      body: stmt,
      varList: bs,
      token: tok,
      when: whenNode,
    };
  }

  /**
   * `stmt = stmt_expr ";"`
   * @returns {StmtNode} 文
   */
  parseStmt(): StmtNode {
    const tok = this.peek();
    // stmt_expr ";"
    const stmt: StmtExpr = this.parseStmtExpr();
    if (!this.isCurrent(";")) {
      const cur = this.peek();
      if (this.isCurrent(TOKEN_TYPE.EOF)) {
        this.errorList.push({
          message: `Expected ;, but got ${JSON.stringify(cur.value)}.`,
          position: {
            line: cur.position.line - 1,
            character: cur.position.character,
          },
        });
        return {
          type: NODE_TYPE.DUMMY,
          token: cur,
        };
      }
      this.errorList.push({
        message: `Expected ;, but got ${JSON.stringify(cur.value)}.`,
        position: cur.position,
      });
      this.next();
      return {
        type: NODE_TYPE.DUMMY,
        token: cur,
      };
    }
    this.next();
    return {
      type: NODE_TYPE.STMT,
      stmt: stmt,
      token: tok,
    };
  }

  /**
   * `stmt_expr = "test" "(" expr ")"
   *          | "when" "(" expr ")"
   *          | "call" "(" atom "," expr "," expr ")"
   *          | assign`
   * @returns {Stmt} 文
   */
  parseStmtExpr(): StmtExpr {
    const tok = this.peek();
    // "test" "(" expr ")"
    if (this.isCurrent("test")) {
      this.next();
      this.consume("(");
      const cond = this.parseExpr();
      this.consume(")");
      return {
        type: NODE_TYPE.TEST,
        cond: cond,
        token: tok,
      };
    }
    // "when" "(" expr ")"
    if (this.isCurrent("when")) {
      this.next();
      this.consume("(");
      const cond = this.parseExpr();
      this.consume(")");
      return {
        type: NODE_TYPE.WHEN,
        cond: cond,
        token: tok,
      };
    }
    // "call" "(" atom "," expr "," expr ")"
    if (this.isCurrent("call")) {
      this.next();
      this.consume("(");
      let mname = "";
      if (
        this.isCurrent(TOKEN_TYPE.ATOM) ||
        this.isCurrent(TOKEN_TYPE.RESERVED)
      ) {
        // localList.fnameから探す
        for (const fname of this.localVarList.fname) {
          if (this.isCurrent(fname)) {
            mname = fname;
            break;
          }
        } // 見つからなかったらエラー
        if (mname === "") {
          this.errorList.push({
            message: `Expected atom, but got ${JSON.stringify(
              this.peek().value
            )}.`,
            position: this.peek().position,
          });
          mname = "dummy";
        }
      } else {
        this.errorList.push({
          message: `Expected atom, but got ${JSON.stringify(
            this.peek().value
          )}.`,
          position: this.peek().position,
        });
        mname = "dummy";
      }
      this.next();
      this.consume(",");
      const input = this.parsePrimary() as StructNode;
      this.consume(",");
      const output = this.parsePrimary() as StructNode;
      this.consume(")");
      return {
        type: NODE_TYPE.CALL,
        module: mname,
        input: input,
        output: output,
        token: tok,
      };
    }
    // assign
    return this.parseAssign();
  }

  /**
   * `assign = primary "=" build-in`
   * @returns {Expr} 代入式
   */
  parseAssign(): AssignNode {
    const tok = this.peek();
    const expr = this.parsePrimary();
    this.consume("=");
    const assign: AssignNode = {
      type: NODE_TYPE.ASSIGN,
      lhs: expr as Primary,
      rhs: this.parseBuildIn(),
      token: tok,
    };
    return assign;
  }

  /**
   * `build_in = "for" "(" expr "," expr "," expr ")"
   *            | "select" "(" list ")"
   *            | calc`
   * @returns {BuildInNode} 組み込み関数
   */
  parseBuildIn(): BuildInNode {
    const tok = this.peek();
    // "for" "(" expr "," expr "," expr ")"
    if (this.isCurrent("for")) {
      this.next();
      this.consume("(");
      const from = this.parseExpr() as Expr;
      // fromが変数の場合は、型が整数か実数であることを確認
      if (from.type === NODE_TYPE.VAR) {
        const ty = (from as VarNode).valueType;
        if (ty.type !== SIMPLE_TYPE.INTEGER && ty.type !== SIMPLE_TYPE.REAL) {
          this.errorList.push({
            message: `Expected integer or real, but got ${ty.type}.`,
            position: ty.token.position,
          });
        }
      }
      this.consume(",");
      const to = this.parseExpr() as Expr;
      // toが変数の場合は、型が整数か実数であることを確認
      if (to.type === NODE_TYPE.VAR) {
        const ty = (to as VarNode).valueType;
        if (ty.type !== SIMPLE_TYPE.INTEGER && ty.type !== SIMPLE_TYPE.REAL) {
          this.errorList.push({
            message: `Expected integer or real, but got ${ty.type}.`,
            position: ty.token.position,
          });
        }
      }
      this.consume(",");
      const inc = this.parseExpr() as Expr;
      // incが変数の場合は、型が整数か実数であることを確認
      if (inc.type === NODE_TYPE.VAR) {
        const ty = (inc as VarNode).valueType;
        if (ty.type !== SIMPLE_TYPE.INTEGER && ty.type !== SIMPLE_TYPE.REAL) {
          this.errorList.push({
            message: `Expected integer or real, but got ${ty.type}.`,
            position: ty.token.position,
          });
        }
      }
      this.consume(")");
      return {
        type: NODE_TYPE.FOR,
        from: from,
        to: to,
        inc: inc,
        token: tok,
      };
    }
    // "select" "(" list ")"
    if (this.isCurrent("select")) {
      this.next();
      this.consume("(");
      const list = this.parsePrimary() as Primary;
      // listが変数の場合は、型がリストであることを確認
      if (list.type === NODE_TYPE.VAR) {
        const ty = (list as VarNode).valueType;
        if (ty.type !== STRUCT_TYPE.LIST) {
          this.errorList.push({
            message: `Expected list, but got ${ty.type}.`,
            position: ty.token.position,
          });
        }
      }
      this.consume(")");
      return {
        type: NODE_TYPE.SELECT,
        list: list,
        token: tok,
      };
    }
    // calc
    return this.parseExpr();
  }

  /**
   * `expr = logical`
   * @returns {Expr} 式
   */
  parseExpr(): Expr {
    return this.parseLogical();
  }

  /**
   * `logical = term *("or" term)`
   * @returns {Expr} 論理式
   */
  parseLogical(): Expr {
    let node = this.parseTerm();
    let token: Token;
    for (;;) {
      if (this.isCurrent("or")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.OR,
          lhs: node,
          rhs: this.parseTerm(),
          token: token,
        };
      } else {
        return node;
      }
    }
  }

  /**
   * `term = not_term *("and" not_term)`
   * @returns {Expr} 項
   */
  parseTerm(): Expr {
    let node = this.parseNotTerm();
    let token: Token;
    for (;;) {
      if (this.isCurrent("and")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.AND,
          lhs: node,
          rhs: this.parseNotTerm(),
          token: token,
        };
      } else {
        return node;
      }
    }
  }

  /**
   * `not_term = "not" "(" equality ")" | equality`
   * @returns {Expr} 否定項
   */
  parseNotTerm(): Expr {
    if (this.isCurrent("not")) {
      const token = this.consume("not");
      this.consume("(");
      const expr = this.parseEquality();
      this.consume(")");
      return {
        type: NODE_TYPE.CALL_EXPR,
        callee: OP_TYPE.NOT,
        lhs: expr,
        token: token,
      };
    }
    return this.parseEquality();
  }

  /**
   * `equality = relational *("=" relational | "\=" relational)`
   * @returns {Expr} 等価式
   */
  parseEquality(): Expr {
    let node = this.parseRelational();
    let token: Token;
    for (;;) {
      if (this.isCurrent("=")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.EQ,
          lhs: node,
          rhs: this.parseRelational(),
          token: token,
        };
      } else if (this.isCurrent("\\=")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.NE,
          lhs: node,
          rhs: this.parseRelational(),
          token: token,
        };
      } else {
        return node;
      }
    }
  }

  /**
   * `relational = add *("<" add | "=<" add | ">" add | ">=" add)`
   * @returns {Expr} 関係式
   */
  parseRelational(): Expr {
    let node = this.parseAdd();
    let token: Token;
    for (;;) {
      if (this.isCurrent("<")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.LT,
          lhs: node,
          rhs: this.parseAdd(),
          token: token,
        };
      } else if (this.isCurrent("=<")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.LE,
          lhs: node,
          rhs: this.parseAdd(),
          token: token,
        };
      } else if (this.isCurrent(">")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.LT,
          lhs: this.parseAdd(),
          rhs: node,
          token: token,
        };
      } else if (this.isCurrent(">=")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.LE,
          lhs: this.parseAdd(),
          rhs: node,
          token: token,
        };
      } else {
        return node;
      }
    }
  }

  /**
   * `add = mul ("+" mul | "-" mul)*`
   * @returns {Expr} 加算式
   */
  parseAdd(): Expr {
    let node = this.parseMul();
    let token: Token;
    for (;;) {
      if (this.isCurrent("+")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.ADD,
          lhs: node,
          rhs: this.parseMul(),
          token: token,
        };
      } else if (this.isCurrent("-")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.SUB,
          lhs: node,
          rhs: this.parseMul(),
          token: token,
        };
      } else {
        return node;
      }
    }
  }

  /**
   * `mul = unary *("*" unary | "/" unary | "mod" unary | "^" unary)`
   * @returns {Expr} 乗算式
   */
  parseMul(): Expr {
    let node = this.parsePow();
    let token: Token;
    for (;;) {
      if (this.isCurrent("*")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.MUL,
          lhs: node,
          rhs: this.parsePow(),
          token: token,
        };
      } else if (this.isCurrent("/")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.DIV,
          lhs: node,
          rhs: this.parsePow(),
          token: token,
        };
      } else if (this.isCurrent("mod")) {
        token = this.peek();
        this.next();
        node = {
          type: NODE_TYPE.CALL_EXPR,
          callee: OP_TYPE.MOD,
          lhs: node,
          rhs: this.parsePow(),
          token: token,
        };
      } else {
        return node;
      }
    }
  }

  /**
   * `pow = unary ("^" pow)?`
   * べき乗は右結合のため、再帰的にパースする
   * @returns {Expr} べき乗演算
   */
  parsePow(): Expr {
    let node = this.parseUnary();
    if (this.isCurrent("^")) {
      const token = this.peek();
      this.next();
      node = {
        type: NODE_TYPE.CALL_EXPR,
        callee: OP_TYPE.POW,
        lhs: node,
        rhs: this.parsePow(), // 右結合にするための再帰呼び出し
        token: token,
      };
    }
    return node;
  }

  /**
   * `unary = ?("+" | "-") primary`
   * @returns {Expr} 単項式
   */
  parseUnary(): Expr {
    if (this.isCurrent("-")) {
      const token = this.consume("-");
      return {
        type: NODE_TYPE.CALL_EXPR,
        callee: OP_TYPE.NEG,
        lhs: this.parsePrimary(),
        token: token,
      };
    }
    if (this.isCurrent("+")) {
      this.next();
      return this.parsePrimary();
    }
    const tok = this.peek();
    return this.parsePrimary();
  }

  /**
   * `primary = "(" expr ")"
   *          | list = "[" ?(unary *("," unary)) "]"
   *          | vector = "{" member *("," member) "}"
   *          | bool
   *          | number
   *          | atom
   *          | ident-var ?(":" type)
   *          | dummy`
   * @returns {Expr} 基本式
   */
  parsePrimary(): Expr {
    const tok = this.peek();
    // "sqrt" "(" expr ")"
    if (this.isCurrent("sqrt")) {
      this.next();
      this.consume("(");
      const expr = this.parseExpr();
      this.consume(")");
      return {
        type: NODE_TYPE.SQRT,
        expr: expr,
        token: tok,
      };
    }
    // "exp" "(" expr ")"
    if (this.isCurrent("exp")) {
      this.next();
      this.consume("(");
      const expr = this.parseExpr();
      this.consume(")");
      return {
        type: NODE_TYPE.EXP,
        expr: expr,
        token: tok,
      };
    }
    // "(" expr ")"
    if (this.isCurrent("(")) {
      this.next();
      const expr = this.parseExpr();
      this.consume(")");
      return expr;
    }
    // list = "[" ?(unary *("," unary)) "]"
    if (this.isCurrent("[")) {
      const tok = this.consume("[");
      const list: Expr[] = [];
      if (!this.isCurrent("]")) {
        list.push(this.parseUnary());
        while (
          this.isCurrent(",") &&
          this.tokenList[this.current + 1].value !== "]"
        ) {
          this.next();
          list.push(this.parseUnary());
        }
        if (
          this.isCurrent(",") &&
          this.tokenList[this.current + 1].value === "]"
        )
          this.next();
      }
      this.consume("]");
      return {
        type: NODE_TYPE.LIST,
        member: list,
        token: tok,
      };
    }
    // vector = "{" member *("," member) "}"
    if (this.isCurrent("{")) {
      const tok = this.consume("{");
      const member: Member[] = [];
      if (!this.isCurrent("}")) {
        member.push(this.parseMember());
        while (
          this.isCurrent(",") &&
          this.tokenList[this.current + 1].value !== "}"
        ) {
          this.next();
          member.push(this.parseMember());
        }
        if (
          this.isCurrent(",") &&
          this.tokenList[this.current + 1].value === "}"
        )
          this.next();
      }
      this.consume("}");
      return {
        type: NODE_TYPE.VECTOR,
        member: member,
        token: tok,
      };
    }
    switch (this.peek().type) {
      // number
      case TOKEN_TYPE.NUMBER:
        return {
          type: NODE_TYPE.NUM,
          token: this.consume(TOKEN_TYPE.NUMBER),
        };
      // string
      case TOKEN_TYPE.STRING:
        return {
          type: NODE_TYPE.STRING,
          token: this.consume(TOKEN_TYPE.STRING),
        };
      // atom
      case TOKEN_TYPE.ATOM:
        // todo: atomPoolが必要?
        return {
          type: NODE_TYPE.ATOM,
          token: this.consume(TOKEN_TYPE.ATOM),
        };
      // ident-var ?(":" type)
      case TOKEN_TYPE.IDENT_VAR: {
        const tok = this.peek();
        // typeのdummyを用意
        let ty: Type = {
          type: "dummy",
          token: {
            type: TOKEN_TYPE.IDENT_VAR,
            position: {
              line: tok.position.line,
              character: tok.position.character + tok.value.length,
            },
            value: "dummy",
          },
        };
        let isInput = false;
        this.next();
        // typeがあれば、型を解析してlocalListに登録
        if (this.isCurrent(":")) {
          this.consume(":");
          ty = this.parseType();
          const v = this.pushVar(tok, ty, true);
          isInput = v.isInput;
        }
        // 型がなければ、すでに存在するかどうかを確認
        const fv = this.findVar(tok);
        if (!fv) {
          this.errorList.push({
            message: `Variable ${JSON.stringify(tok.value)} is not defined.`,
            position: ty.token.position,
          });
          return {
            type: NODE_TYPE.DUMMY,
            token: tok,
          };
        }
        ty = fv.valueType;
        return {
          type: NODE_TYPE.VAR,
          name: tok.value,
          valueType: ty,
          token: tok,
          isInput: isInput,
        };
      }
      default: {
        const cur = this.peek();
        this.errorList.push({
          message: `Unexpected token ${JSON.stringify(cur.value)}.`,
          position: cur.position,
        });
        this.next();

        return {
          type: NODE_TYPE.DUMMY,
          token: cur,
        };
      }
    }
  }

  /**
   * `member = unary | ident ?(":" type)`
   * @returns {Member} メンバー
   */
  parseMember(): Member {
    const tok = this.peek();
    let ty: Type = {
      type: "dummy",
      token: tok,
    };
    if (this.isCurrent(TOKEN_TYPE.IDENT_VAR)) {
      this.next();
      if (this.isCurrent(":")) {
        this.next();
        ty = this.parseType();
      }
      return {
        type: NODE_TYPE.MEMBER,
        value: {
          type: NODE_TYPE.VAR,
          name: tok.value,
          valueType: ty,
          token: tok,
          isInput: false,
        },
        token: tok,
      };
    }
    const node = this.parseUnary();
    return {
      type: NODE_TYPE.MEMBER,
      token: tok,
      value: node,
    };
  }
}

/**
 * 構文解析
 * @param {Token[]} input トークンリスト
 * @returns {ParseResult} 構文解析の結果
 */
export const parser = (input: Token[]): ParseResult => {
  const parser = new Parser();
  return parser.exec(input);
};
