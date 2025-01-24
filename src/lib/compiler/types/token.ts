import type { TOKEN_TYPE } from "../constant";

export type TokenType = (typeof TOKEN_TYPE)[keyof typeof TOKEN_TYPE];

export type Token = {
  type: TokenType;
  position: { line: number; character: number };
  value: string;
};
