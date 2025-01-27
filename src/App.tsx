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
  const [output, setOutput] = useState<{
    output: string;
    props: {
      input: { name: string; type: string }[];
      output: { name: string; type: string }[];
    };
  }>({
    output: "",
    props: {
      input: [],
      output: [],
    },
  });
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const [result, setResult] = useState<any[]>();
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
      setOutput({
        output: "",
        props: {
          input: [],
          output: [],
        },
      });
      return;
    }
    setOutput(o);
  };

  const handleRun = async () => {
    if (fileMappingRef.current) {
      revokeAllFileMapping(fileMappingRef.current);
    }
    browserBundle(output.output, "main.ts", {
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
        // ここで、output.props.input に対応する値の入力を求める
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const userInput: { [key: string]: any } = {};
        for (const input of output.props.input) {
          const v = prompt(`${input.name}(${input.type}) = `);
          if (v) {
            if (input.type.includes("[]")) {
              if (input.type.includes("number")) {
                userInput[`_${input.name}`] = [Number.parseFloat(v)];
              } else {
                userInput[`_${input.name}`] = [v];
              }
            } else if (input.type === "number") {
              userInput[`_${input.name}`] = Number.parseFloat(v);
            } else {
              userInput[`_${input.name}`] = v;
            }
          }
        }
        const resultValue = mod.main(userInput);
        setResult(resultValue);
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
              disabled={output.output === ""}
            >
              実行
            </button>
          </div>
          {Array.isArray(result) ? (
            <ul>
              {result.map((item, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <li key={idx}>
                  {output.props.output.map((o) => (
                    <p key={o.name}>
                      {o.name}({o.type}) = {String(item[o.name])},{" "}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            <pre>{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      </div>
    </>
  );
};

export default App;
