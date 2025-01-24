import type React from "react";
import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import "./App.css";
import { browserBundle, revokeAllFileMapping } from "./lib/browser-bundle";

const defaultMain = `import { hello } from "./hello";

export const greet = hello("World");
console.log("main.ts greet =>", greet);
`;

const defaultHello = `export const hello = ( name: string ) => {
  return "Hello, " + name + "!";
}
`;

// const defaultHtml = `<html>
// <head>
//   <script src="https://cdn.tailwindcss.com"></script>
// </head>
// <body>
//   <div id="root"></div>
// </body>
// </html>
// `;

// const styleCSS = `
//  body {
//   color: red;
//  }
// `;

// const buildSrcDoc = (html: string, code: string) => {
//   return html.replace(
//     "</body>",
//     `  <script type="module">${code}</script>\n</body>`
//   );
// };

const App: React.FC = () => {
  const [script, setScript] = useState({
    "main.ts": defaultMain,
    "hello.ts": defaultHello,
  });
  const [tab, setTab] = useState<keyof typeof script>("main.ts");
  const [result, setResult] = useState("");
  const fileMappingRef = useRef<Map<string, string>>();

  const handleRun = async () => {
    if (fileMappingRef.current) {
      revokeAllFileMapping(fileMappingRef.current);
    }
    browserBundle(script["main.ts"], "main.ts", {
      files: {
        "./hello.ts": script["hello.ts"],
      },
      compilerOptions: {},
      // importMap: {
      //   "react": "https://cdn.skypack.dev/react",
      //   "react-dom": "https://cdn.skypack.dev/react-dom",
      // }
    })
      .then(async ({ code, fileMapping }) => {
        fileMappingRef.current = fileMapping;
        // 2) 変換された JSコードを Blob に変換
        const blob = new Blob([code], { type: "text/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        // 3) dynamic import で読み込む
        // ここで main.ts 内の console.log も呼び出され、結果がコンソールに表示される
        const mod = await import(/* @vite-ignore */ blobUrl);
        // 4) exportされた値を取得
        // main.ts で `export const browserHello`, `export const greet` にした場合
        setResult(mod.greet);
      })
      .catch((e) => {
        console.error(e);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScript((script) => ({ ...script, [tab]: e.target.value }));
  };

  return (
    <div className="container">
      <div className="leftPanel">
        <div className="tabWrapper">
          <ul>
            {(["main.ts", "hello.ts"] as const).map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => setTab(item)}
                  className={clsx(["tabButton", tab === item ? "active" : ""])}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <textarea
          key={tab}
          className="textArea"
          onChange={handleChange}
          defaultValue={script[tab]}
        />
      </div>
      <div className="previewContainer">
        <div className="previewWrapper">
          <p className="previewTitle">プレビュー結果</p>
          <button type="button" className="tabButton" onClick={handleRun}>
            実行
          </button>
        </div>

        {result && <pre>{result}</pre>}
      </div>
    </div>
  );
};

export default App;
