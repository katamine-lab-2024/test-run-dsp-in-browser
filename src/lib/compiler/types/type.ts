import type {
  NEW_SIMPLE_TYPE,
  NEW_STRUCT_TYPE,
  SIMPLE_TYPE,
  STRUCT_TYPE,
} from "../constant";
import type { Token } from "./token";

// 変数の型
export type TypeKind =
  | (typeof SIMPLE_TYPE)[keyof typeof SIMPLE_TYPE]
  | (typeof STRUCT_TYPE)[keyof typeof STRUCT_TYPE]
  | "dummy";

// 基底の型
type BaseType = {
  type: TypeKind;
  token: Token;
};

// 単純変数を表す型
export type SimpleType = {
  type:
    | typeof SIMPLE_TYPE.INTEGER
    | typeof SIMPLE_TYPE.REAL
    | typeof SIMPLE_TYPE.BOOL
    | typeof SIMPLE_TYPE.ATOM;
  num?: string;
} & BaseType;

// 構造変数を表す型
export type StructType = {
  type: typeof STRUCT_TYPE.LIST | typeof STRUCT_TYPE.VECTOR;
  member: Type[];
  count?: number;
} & BaseType;

export type Type = SimpleType | StructType | BaseType;

// 新しい型
export type NewSimple = {
  type: (typeof NEW_SIMPLE_TYPE)[keyof typeof NEW_SIMPLE_TYPE];
  token: Token;
};

export type NewStruct = {
  type: (typeof NEW_STRUCT_TYPE)[keyof typeof NEW_STRUCT_TYPE];
  member: NewType[];
  token: Token;
};

export type NewType =
  | NewSimple
  | NewStruct
  | {
      type: "dummy";
      token: Token;
    };
