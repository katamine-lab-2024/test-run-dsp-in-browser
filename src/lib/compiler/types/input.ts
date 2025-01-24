// 行番号とその行の内容
export type Line = {
  num: number;
  content: string;
};

// 変換されたファイル内容
export type NewInput = Line[];
