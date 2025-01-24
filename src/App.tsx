import type React from "react";
import { useState, useRef, useEffect } from "react";
import "./App.css";
import { browserBundle, revokeAllFileMapping } from "./lib/browser-bundle";
import { compiler } from "./lib/compiler/main";
import { getFileString } from "./util/getFileString";

const defaultMain = `pointInQuarterCircle({R : real}, {X : real, Y : real})
  method
    X : real = for(0.0, R, 1.0);
    Y : real = for(0.0, R, 1.0);
    D : real = sqrt(X^2 + Y^2);
    test(D =< R);
  end method;
end module;
`;

const App: React.FC = () => {
  const [modules, setModules] = useState<{ [key: string]: string }>({});
  const [input, setInput] = useState(defaultMain);
  const [output, setOutput] = useState("");
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

  const handleCompile = async () => {
    const o = compiler("input", input);
    if (!o) {
      setOutput("");
      return;
    }
    setOutput(o);
  };

  const handleRun = async () => {
    if (fileMappingRef.current) {
      revokeAllFileMapping(fileMappingRef.current);
    }
    browserBundle(output, "main.ts", {
      files: {
        ...modules,
      },
      compilerOptions: {},
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
        const resultValue = mod.main({ _R: userInput });
        setResult(resultValue);

        // setResult(mod.result);
      })
      .catch((e) => {
        console.error(e);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <>
      <div className="container">
        <div className="leftPanel">
          <div className="tabWrapper">
            <ul>
              <li>DSP</li>
              <li>
                <button
                  type="button"
                  onClick={handleCompile}
                  className="tabButton"
                >
                  変換する
                </button>
              </li>
            </ul>
          </div>
          <textarea
            className="textArea"
            onChange={handleChange}
            defaultValue={input}
          />
        </div>
        <div className="previewContainer">
          <div className="previewWrapper">
            <p className="previewTitle">プレビュー結果</p>
            <button
              type="button"
              className="tabButton"
              onClick={handleRun}
              disabled={!output}
            >
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
