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
  const [mod, setMod] = useState<any>();
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const [result, setResult] = useState<any[]>();
  const fileMappingRef = useRef<Map<string, string>>();
  const [openModal, setOpenModal] = useState(false);
  const [inputValue, setInputValue] = useState<{
    [key: string]: {
      type: string;
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      value: any;
    };
  }>();

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
    await browserBundle(output.output, "main.ts", {
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
        const m = await import(/* @vite-ignore */ blobUrl);
        setMod(m);
        // ここで、output.props.input に対応する値の入力を求める
        for (const input of output.props.input) {
          const type = input.type;
          setInputValue((prev) => ({
            ...prev,
            [input.name]: {
              type: type,
              value: "",
            },
          }));
        }
      })
      .catch((e) => {
        console.error("TSプログラムのバンドルに失敗しました:", e);
      });
    setOpenModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleStopRunning = () => {
    if (fileMappingRef.current) {
      revokeAllFileMapping(fileMappingRef.current);
    }
    setOutput({
      output: "",
      props: {
        input: [],
        output: [],
      },
    });
    setInputValue({});
    setOpenModal(false);
  };

  const handleStartRunning = async () => {
    if (!mod) return;
    if (!inputValue) return;

    setOpenModal(false);

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const userInput: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(inputValue)) {
      if (value.type.includes("[]")) {
        if (value.type.includes("number")) {
          userInput[`_${key}`] = [Number.parseFloat(value.value)];
        } else if (value.type.includes("boolean")) {
          userInput[`_${key}`] = [value.value === "true"];
        } else {
          userInput[`_${key}`] = [value.value];
        }
      } else if (value.type.startsWith("{")) {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const objValue: { [key: string]: any } = {};
        // biome-ignore lint/complexity/noForEach: <explanation>
        value.type
          .slice(1, -1)
          .split(",")
          .forEach((item) => {
            const [rawKey, rawType] = item.split(":");
            const keyTrim = rawKey.trim();
            const typeTrim = rawType.trim();
            if (typeTrim.includes("number")) {
              objValue[keyTrim] = Number.parseFloat(value.value[keyTrim]);
            } else if (typeTrim.includes("boolean")) {
              objValue[keyTrim] = value.value[keyTrim] === "true";
            } else {
              objValue[keyTrim] = value.value[keyTrim];
            }
          });
        userInput[`_${key}`] = objValue;
      } else if (value.type === "number") {
        userInput[`_${key}`] = Number.parseFloat(value.value);
      } else if (value.type === "boolean") {
        userInput[`_${key}`] = value.value === "true";
      } else {
        userInput[`_${key}`] = value.value;
      }
    }

    try {
      const resultValue = mod.main(userInput);
      setResult(resultValue);
    } catch (e) {
      console.error("プログラムの実行に失敗しました:", e);
    }
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
                  {output.props.output.map((o) => {
                    const name = o.name;
                    const type = o.type;
                    let value = item[o.name];
                    if (type.includes("number")) {
                      // 小数点以下6桁まで表示
                      value = String(Number(value).toFixed(6));
                    } else if (type.includes("object")) {
                      value = `{${Object.entries(value)
                        .map(([key, val]) => `${val}`)
                        .join(", ")}}`;
                    }
                    return (
                      <p key={name}>
                        {name}: {type} = {value},{" "}
                      </p>
                    );
                  })}
                </li>
              ))}
            </ul>
          ) : (
            <pre>{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      </div>
      {openModal && (
        <div className="modal">
          <div className="modal-content">
            <p>基底属性値の入力</p>
            {inputValue && (
              <ul>
                {Object.entries(inputValue).map(([key, value]) => (
                  <li key={key}>
                    <div>
                      {key}({value.type}) = {/* value.typeで場合わけ */}
                      {value.type.includes("[]") ? (
                        <input
                          type="text"
                          value={value.value}
                          onChange={(e) => {
                            setInputValue((prev) => ({
                              ...prev,
                              [key]: {
                                type: value.type,
                                value: e.target.value,
                              },
                            }));
                          }}
                        />
                      ) : value.type.startsWith("{") ? (
                        value.type
                          .slice(1, -1)
                          .split(",")
                          .map((item) => {
                            const [rawKey, rawType] = item.split(":");
                            const keyTrim = rawKey.trim();
                            const typeTrim = rawType.trim();
                            return (
                              <div key={keyTrim}>
                                {keyTrim}({typeTrim}):{" "}
                                <input
                                  type="text"
                                  value={value.value[keyTrim] ?? ""}
                                  onChange={(e) => {
                                    setInputValue((prev) => ({
                                      ...prev,
                                      [key]: {
                                        type: value.type,
                                        value: {
                                          ...value.value,
                                          [keyTrim]: e.target.value,
                                        },
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            );
                          })
                      ) : value.type === "boolean" ? (
                        <select
                          value={value.value}
                          onChange={(e) => {
                            setInputValue((prev) => ({
                              ...prev,
                              [key]: {
                                type: value.type,
                                value: e.target.value,
                              },
                            }));
                          }}
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={value.value}
                          onChange={(e) => {
                            setInputValue((prev) => ({
                              ...prev,
                              [key]: {
                                type: value.type,
                                value: e.target.value,
                              },
                            }));
                          }}
                        />
                      )}
                      {/* <input
                        type="text"
                        value={value.value}
                        onChange={(e) => {
                          setInputValue((prev) => ({
                            ...prev,
                            [key]: {
                              type: value.type,
                              value: e.target.value,
                            },
                          }));
                        }}
                      /> */}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="modal-button-wrapper">
              <button type="button" onClick={handleStopRunning}>
                中止
              </button>
              <button
                type="button"
                onClick={handleStartRunning}
                disabled={Object.values(inputValue || {}).some(
                  (value) => value.value === ""
                )}
              >
                開始
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
