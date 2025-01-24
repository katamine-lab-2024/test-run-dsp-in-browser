// エラーを格納する型
export type CompileError = {
  message: string;
  position: { line: number; character: number };
};
