/**
 * トークンの種類
 */
export const TOKEN_TYPE = {
  RESERVED: "reserved",
  IDENT_VAR: "ident-var",
  IDENT_FUNC: "ident-func",
  ATOM: "literal-atom",
  STRING: "string",
  NUMBER: "number",
  NEWLINE: "new-line",
  EOF: "EOF",
} as const;

/**
 * 構文木ノードの種類
 */
export const NODE_TYPE = {
  // リテラル値
  NUM: "num",
  STRING: "string",

  // 単純変数
  BOOL: "bool",
  ATOM: "atom",

  // 構造変数
  VECTOR: "vector",
  MEMBER: "member",
  LIST: "list",
  VAR: "var",

  // 文
  CALL_EXPR: "call-expr",
  ASSIGN: "assign",
  BLOCK: "block",
  STMT: "stmt",
  PARAM: "param",
  MODULE: "module",
  PROGRAM: "program",
  DUMMY: "dummy",

  // 制御構文
  WHEN: "when",
  TEST: "test",
  FOR: "for",
  SELECT: "select",
  CALL: "call",
  SQRT: "sqrt",
} as const;

// 演算子の種類
export const OP_TYPE = {
  ADD: "add",
  SUB: "sub",
  MUL: "mul",
  DIV: "div",
  MOD: "mod",
  POW: "pow",
  EQ: "EQ",
  NE: "NE",
  LT: "LT",
  LE: "LE",
  AND: "and",
  OR: "or",
  NOT: "not",
  NEG: "neg",
} as const;

// 定数の型
export const CONST_TYPE = {
  INTEGER: "integer",
  REAL: "real",
  STRING: "string",
} as const;

// 単純変数の型
export const SIMPLE_TYPE = {
  INTEGER: CONST_TYPE.INTEGER,
  REAL: CONST_TYPE.REAL,
  ATOM: "atom",
  BOOL: "bool",
} as const;

// 構造変数の型
export const STRUCT_TYPE = {
  LIST: "list",
  VECTOR: "vector",
} as const;

// typeScriptの型
export const NEW_SIMPLE_TYPE = {
  NUMBER: "number",
  STRING: "string",
  BOOLEAN: "boolean",
} as const;

// 構造変数の型
export const NEW_STRUCT_TYPE = {
  ARRAY: "array",
  OBJECT: "object",
} as const;

/**
 * 新しい構文木ノードの種類
 */
export const NEW_NODE_TYPE = {
  // リテラル値
  NUM: "num",
  STRING: "string",
  BOOLEAN: "boolean",

  // 構造変数
  OBJECT: "object",
  MEMBER: "member",
  LIST: "list",
  VAR: "var",

  // 文
  CALL_EXPR: "call-expr",
  ASSIGN: "assign",
  BLOCK: "block",
  RETURN: "return",
  STMT: "stmt",
  PARAM: "param",
  METHOD: "method",
  CLASS: "class",
  PROGRAM: "program",
  DUMMY: "dummy",

  // 制御構文
  IF: "if",
  ELSE: "else",
  FOR: "for",
  SELECT: "select",
  SQRT: "sqrt",
} as const;
