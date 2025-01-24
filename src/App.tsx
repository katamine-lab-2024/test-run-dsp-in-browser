import type React from "react";
import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import "./App.css";
import { browserBundle, revokeAllFileMapping } from "./lib/browser-bundle";
import { getFileString } from "./util/getFileString";

const defaultMain = `import { hello } from "./hello";

export const greet = hello("World");
console.log("main.ts greet =>", greet);
`;

const App: React.FC = () => {
  const [modules, setModules] = useState<{ [key: string]: string }>({});
  const [script, setScript] = useState({
    "main.ts": defaultMain,
  });
  const [tab, setTab] = useState<keyof typeof script>("main.ts");
  const [result, setResult] = useState();
  const fileMappingRef = useRef<Map<string, string>>();

  useEffect(() => {
    const moduleFiles = import.meta.glob("./module/**/*.ts", {
      query: "?raw",
      import: "default",
    });
    (async () => {
      const files = await getFileString(moduleFiles, "./module/");
      setModules(files);
    })();
  });

  const handleRun = async () => {
    if (fileMappingRef.current) {
      revokeAllFileMapping(fileMappingRef.current);
    }
    browserBundle(script["main.ts"], "main.ts", {
      files: {
        ...modules,
      },
      compilerOptions: {},
      // importMap: {
      //   "react": "https://cdn.skypack.dev/react",
      //   "react-dom": "https://cdn.skypack.dev/react-dom",
      // }
    })
      .then(async ({ code, fileMapping }) => {
        fileMappingRef.current = fileMapping;
        // 変換された JSコードを Blob に変換
        const blob = new Blob([code], { type: "text/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        // dynamic import で読み込む
        // ここで main.ts 内の console.log も呼び出され、結果がコンソールに表示される
        const mod = await import(/* @vite-ignore */ blobUrl);

        // ここでinputを受け取って呼び出す
        const userInput = Number(
          prompt("数値を入力してください", "10") || "10"
        );
        const resultValue = mod.main(userInput);
        setResult(resultValue);

        // setResult(mod.result);
      })
      .catch((e) => {
        console.error(e);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScript((script) => ({ ...script, [tab]: e.target.value }));
  };

  return (
    <>
      <div className="container">
        <div className="leftPanel">
          <div className="tabWrapper">
            <ul>
              {(["main.ts"] as const).map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => setTab(item)}
                    className={clsx([
                      "tabButton",
                      tab === item ? "active" : "",
                    ])}
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
          {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
        </div>
      </div>
    </>
  );
};

export default App;
