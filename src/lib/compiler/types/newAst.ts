import type { NEW_NODE_TYPE, NODE_TYPE, OP_TYPE } from "../constant";
import type { Token } from "./token";
import type { NewType } from "./type";
import type * as ast from "./ast";

// 構文木
export type NodeType = (typeof NEW_NODE_TYPE)[keyof typeof NEW_NODE_TYPE];

// 基底ノード
type BaseNode = {
  type: NodeType;
  // エラー報告のため、トークンを保持
  token: Token;
};

// ダミー
// エラー時にダミーノードを返して解析を継続する
export type Dummy = {
  type: typeof NEW_NODE_TYPE.DUMMY;
} & BaseNode;

// リテラル
export type LiteralNode = {
  type:
    | typeof NEW_NODE_TYPE.NUM
    | typeof NEW_NODE_TYPE.STRING
    | typeof NEW_NODE_TYPE.BOOLEAN;
} & BaseNode;

// 変数
export type VarNode = {
  type: typeof NEW_NODE_TYPE.VAR;
  isInParam: boolean;
  isInput: boolean;
  name: string;
  valueType: NewType;
} & BaseNode;

// リスト
export type ListNode = {
  type: typeof NEW_NODE_TYPE.LIST;
  member: Expr[];
} & BaseNode;

// ベクトル(構造体)
export type StructNode = {
  type: typeof NEW_NODE_TYPE.OBJECT;
  member: Member[];
} & BaseNode;

// ベクトルのメンバー
export type Member = {
  type: typeof NEW_NODE_TYPE.MEMBER;
  value: Expr | VarNode;
} & BaseNode;

// Primary
export type Primary = LiteralNode | VarNode | ListNode | StructNode | Dummy;

// 単項演算子
export type UnaryNode = {
  type: typeof NEW_NODE_TYPE.CALL_EXPR;
  callee: typeof OP_TYPE.NOT | typeof OP_TYPE.NEG;
  lhs: Expr;
} & BaseNode;

// 二項演算子
export type BinaryNode = {
  type: typeof NEW_NODE_TYPE.CALL_EXPR;
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
export type Expr = Primary | UnaryNode | BinaryNode;

// 仮定・生成
// for
export type ForNode = {
  type: typeof NEW_NODE_TYPE.FOR;
  target?: Primary;
  from: Expr;
  to: Expr;
  inc: Expr;
} & BaseNode;

export type SelectNode = {
  type: typeof NEW_NODE_TYPE.SELECT;
  target?: Primary;
  list: Primary;
} & BaseNode;

// 数値演算
// 平方根: sqrt
export type SqrtNode = {
  type: typeof NEW_NODE_TYPE.SQRT;
  expr: Expr;
} & BaseNode;

// 組み込みモジュール
export type BuildInNode = ForNode | SelectNode | SqrtNode | If | Expr;

// 代入文
export type AssignNode = {
  type: typeof NEW_NODE_TYPE.ASSIGN;
  lhs: Primary;
  rhs: BuildInNode;
} & BaseNode;

// return文
export type Return = {
  type: typeof NEW_NODE_TYPE.RETURN;
  value: BuildInNode | Expr | Primary;
} & BaseNode;

// if文
export type If = {
  type: typeof NEW_NODE_TYPE.IF;
  cond: Expr;
  then?: StmtNode[];
  else?: If | StmtNode[];
  constraint?: VarNode;
} & BaseNode;

// エラー対応にダミーを含む
export type StmtNode = If | AssignNode | Return | Dummy;

// クラスメソッド
export type Method = {
  type: typeof NEW_NODE_TYPE.METHOD;
  //   name: string; // `exec`
  body: StmtNode[];
} & BaseNode;

export type MethodNode = Method | Class | Dummy;

// モジュール(関数定義)
export type Class = {
  type: typeof NEW_NODE_TYPE.CLASS;
  name: string;
  fieldList: ParamNode[];
  body: MethodNode[];
} & BaseNode;

// エラー対応にダミーを含む
export type ClassNode = Class | Dummy;

// モジュールの引数
// todo: tsではVarNode[]は変
export type Param = {
  type: typeof NEW_NODE_TYPE.PARAM;
  value: VarNode[];
} & BaseNode;

// エラー対応にダミーを含む
export type ParamNode = Param | Dummy;

// プログラム
export type Program = {
  type: typeof NEW_NODE_TYPE.PROGRAM;
  body: ClassNode[];
};

export type Node =
  | LiteralNode
  | VarNode
  | ListNode
  | StructNode
  | UnaryNode
  | BinaryNode
  | ForNode
  | SelectNode
  | SqrtNode
  | AssignNode
  | Return
  | If
  | Method
  | ClassNode
  | Param
  | Program;

const stmtBlockType = "stmt-block" as const;

// Visitorの型を定義
export type Visitor = {
  [NODE_TYPE.NUM]: (node: ast.LiteralNode) => LiteralNode;
  [NODE_TYPE.VAR]: (node: ast.VarNode) => VarNode;
  //todo: 本来は違うけど、paramのためにvarNode
  [NODE_TYPE.MEMBER]: (node: ast.Member) => VarNode;
  [NODE_TYPE.CALL_EXPR]: (node: ast.Expr) => Expr;
  [NODE_TYPE.SQRT]: (node: ast.SqrtNode) => SqrtNode;
  [NODE_TYPE.FOR]: (node: ast.ForNode) => ForNode;
  [NODE_TYPE.SELECT]: (node: ast.SelectNode) => SelectNode;
  [NODE_TYPE.ASSIGN]: (node: ast.AssignNode) => AssignNode | Return | If;
  [NODE_TYPE.TEST]: (node: ast.TestNode) => If;
  [stmtBlockType]: (node: ast.StmtBlock) => ClassNode;
  [NODE_TYPE.BLOCK]: (node: ast.Block) => ClassNode;
  [NODE_TYPE.PARAM]: (node: ast.ParamNode) => ParamNode;
  [NODE_TYPE.MODULE]: (node: ast.Module) => ClassNode;
  [NODE_TYPE.PROGRAM]: (node: ast.Program) => Program;
};
