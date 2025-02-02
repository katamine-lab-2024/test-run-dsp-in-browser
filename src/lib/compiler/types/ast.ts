import type { NODE_TYPE, OP_TYPE } from "../constant";
import type { Token } from "./token";
import type { Type } from "./type";

// 構文木
export type NodeType =
  | (typeof NODE_TYPE)[keyof typeof NODE_TYPE]
  | typeof stmtBlockType;

// 基底ノード
type BaseNode = {
  type: NodeType;
  // エラー報告のため、トークンを保持
  token: Token;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  _context?: any;
};

// ダミー
// エラー時にダミーノードを返して解析を継続する
export type Dummy = {
  type: typeof NODE_TYPE.DUMMY;
} & BaseNode;

// リテラル
export type LiteralNode = {
  type: typeof NODE_TYPE.NUM | typeof NODE_TYPE.STRING | typeof NODE_TYPE.ATOM;
} & BaseNode;

// 変数
export type VarNode = {
  type: typeof NODE_TYPE.VAR;
  name: string;
  valueType: Type;
  isInput: boolean;
} & BaseNode;

// リスト
export type ListNode = {
  type: typeof NODE_TYPE.LIST;
  member: Expr[];
} & BaseNode;

// ベクトル(構造体)
export type StructNode = {
  type: typeof NODE_TYPE.VECTOR;
  member: Member[];
} & BaseNode;

// ベクトルのメンバー
export type Member = {
  type: typeof NODE_TYPE.MEMBER;
  value: Expr | VarNode;
} & BaseNode;

// Primary
export type Primary =
  | LiteralNode
  | VarNode
  | ListNode
  | StructNode
  | CalcNode
  | Dummy;

// 単項演算子
export type UnaryNode = {
  type: typeof NODE_TYPE.CALL_EXPR;
  callee: typeof OP_TYPE.NOT | typeof OP_TYPE.NEG;
  lhs: Expr;
} & BaseNode;

// 二項演算子
export type BinaryNode = {
  type: typeof NODE_TYPE.CALL_EXPR;
  callee:
    | typeof OP_TYPE.ADD
    | typeof OP_TYPE.SUB
    | typeof OP_TYPE.MUL
    | typeof OP_TYPE.DIV
    | typeof OP_TYPE.MOD
    | typeof OP_TYPE.POW
    | typeof OP_TYPE.EQ
    | typeof OP_TYPE.NE
    | typeof OP_TYPE.LT
    | typeof OP_TYPE.LE
    | typeof OP_TYPE.AND
    | typeof OP_TYPE.OR;
  lhs: Expr;
  rhs: Expr;
} & BaseNode;

// 式
export type Expr = Primary | BinaryNode | UnaryNode;

// 計算
export type CalcNode = SqrtNode | ExpNode;

// 仮定・生成
// for
export type ForNode = {
  type: typeof NODE_TYPE.FOR;
  from: Expr;
  to: Expr;
  inc: Expr;
} & BaseNode;

// select
export type SelectNode = {
  type: typeof NODE_TYPE.SELECT;
  list: Primary;
} & BaseNode;

// 数値演算
// 平方根: sqrt
export type SqrtNode = {
  type: typeof NODE_TYPE.SQRT;
  expr: Expr;
} & BaseNode;

// 指数関数: exp
export type ExpNode = {
  type: typeof NODE_TYPE.EXP;
  expr: Expr;
} & BaseNode;

// 組み込みモジュール
export type BuildInNode = ForNode | SelectNode | Expr;

// 代入文
export type AssignNode = {
  type: typeof NODE_TYPE.ASSIGN;
  lhs: Primary;
  rhs: BuildInNode;
} & BaseNode;

// 条件分岐
// when
export type WhenNode = {
  type: typeof NODE_TYPE.WHEN;
  cond: Expr;
} & BaseNode;

// 枝刈り
// test
export type TestNode = {
  type: typeof NODE_TYPE.TEST;
  cond: Expr;
} & BaseNode;

// モジュール呼び出し
// call
export type CallNode = {
  type: typeof NODE_TYPE.CALL;
  module: string;
  input: StructNode;
  output: StructNode;
} & BaseNode;

// 文式
export type StmtExpr = AssignNode | TestNode | WhenNode | CallNode;

// 文(";"で区切られた式)
export type Stmt = {
  type: typeof NODE_TYPE.STMT;
  stmt: StmtExpr;
} & BaseNode;

// エラー対応にダミーを含む
export type StmtNode = Stmt | Dummy;

// ブロック
export type Block = {
  type: typeof NODE_TYPE.BLOCK;
  body: StmtNode[];
  // block内で定義された変数
  varList: VarNode[];
  when?: Expr;
} & BaseNode;

const stmtBlockType = "stmt-block" as const;

//仮
export type StmtBlock = {
  type: typeof stmtBlockType;
  body: StmtNode[];
  phase: "assume" | "calc" | "test";
  target: VarNode;
  operand?: VarNode[];
} & BaseNode;

// エラー対応にダミーを含む
export type BlockNode = Block | Dummy;

// モジュール(関数定義)
export type Module = {
  type: typeof NODE_TYPE.MODULE;
  name: string;
  paramList: ParamNode[];
  body: BlockNode[];
  localList: VarNode[];
} & BaseNode;

// エラー対応にダミーを含む
export type ModuleNode = Module | Dummy;

// モジュールの引数
export type Param = {
  type: typeof NODE_TYPE.PARAM;
  value: LiteralNode | Member[];
} & BaseNode;

// エラー対応にダミーを含む
export type ParamNode = Param | Dummy;

// プログラム
export type Program = {
  type: typeof NODE_TYPE.PROGRAM;
  body: ModuleNode[];
};

export type Node =
  | BuildInNode
  | StmtExpr
  | StmtNode
  | BlockNode
  | ModuleNode
  | ParamNode
  | Program
  | StmtBlock
  | Member;
