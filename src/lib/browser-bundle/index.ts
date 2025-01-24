import {
  initialize as esInitialize,
  type Loader,
  transform,
  type TsconfigRaw,
} from "esbuild-wasm";

export function replaceAsync(
  str: string,
  regex: RegExp,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  asyncFn: (match: string, ...args: any[]) => Promise<string>
): Promise<string> {
  const promises: Promise<string>[] = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
    return match; // この戻り値は無視される
  });
  return Promise.all(promises).then((results) => {
    return str.replace(regex, () => results.shift() ?? "");
  });
}

// loaderを判定するための関数
const getLoader = (filePath: string): Loader => {
  if (filePath.endsWith(".tsx")) return "tsx";
  if (filePath.endsWith(".ts")) return "ts";
  if (filePath.endsWith(".jsx")) return "jsx";
  if (filePath.endsWith(".js")) return "js";
  return "tsx"; // デフォルトはts(あるいはjs)などにする
};

export type Options = {
  compilerOptions?: TsconfigRaw["compilerOptions"];
  files?: Record<string, string>;
  importMap?: Record<string, string>;
};

export const getMatchedFile = (path: string, files: Record<string, string>) => {
  return ["", ".ts", ".tsx", ".js", ".jsx"]
    .map((e) => files[path + e])
    .find((e) => !!e);
};

export const resolvePackage = async (
  packageName: string,
  options: Options,
  fileMapping: Map<string, string>
) => {
  if (packageName.startsWith(".") || packageName.startsWith("/")) {
    // import文をBlob URLから読み込むように変換する
    if (options.files) {
      const file = getMatchedFile(packageName, options.files);
      if (file) {
        if (fileMapping.has(packageName)) {
          return fileMapping.get(packageName) as string;
        }
        if (packageName.includes(".css")) {
          const blob = new Blob([file], { type: "text/css" });
          const blobUrl = URL.createObjectURL(blob);
          fileMapping.set(packageName, blobUrl);
          return blobUrl;
        }
        const { code } = await transformCode(
          file,
          packageName,
          options,
          fileMapping
        );
        // transform中にfileMappingが更新されている可能性があるので再度確認する
        if (fileMapping.has(packageName)) {
          return fileMapping.get(packageName);
        }
        const blob = new Blob([code], { type: "text/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        fileMapping.set(packageName, blobUrl);
        return blobUrl;
      }
    }
  } else {
    if (options?.importMap?.[packageName]) {
      return options.importMap[packageName];
    }
    return `https://esm.sh/${packageName}`;
  }
  return packageName;
};

export const transformCode = async (
  code: string,
  filePath: string, // 追加
  options: Options,
  fileMapping = new Map<string, string>()
): Promise<{
  code: string;
  fileMapping: Map<string, string>;
}> => {
  const compilerOptions = {
    jsx: "react-jsx",
    target: "esnext",
    module: "esnext",
  } as const;

  const loader = getLoader(filePath);

  const { code: outputText } = await transform(code, {
    loader: loader,
    tsconfigRaw: {
      compilerOptions: {
        ...compilerOptions,
        ...options.compilerOptions,
      },
    },
  });

  const fixedText = await replaceAsync(
    outputText,
    /import\(['"](.+)['"]\)/g,
    async (_, packageName: string) => {
      return `import('${await resolvePackage(
        packageName,
        options,
        fileMapping
      )}')`;
    }
  );
  const result = await replaceAsync(
    fixedText,
    /(\/\/\s*)?(import\s+)([\s\S]*?\s+from\s+)?['"](.*)['"];?/g,
    async (
      raw,
      commentKey: string,
      importKey: string,
      fromKey: string,
      packageName: string
    ) => {
      if (commentKey) return raw;
      const resolvedPackageName = await resolvePackage(
        packageName,
        options,
        fileMapping
      );
      if (packageName.endsWith(".css")) {
        return `(function () {
            const css = document.createElement("link");
            css.setAttribute("rel","stylesheet");
            css.setAttribute("type","text/css");
            css.setAttribute("href","${resolvedPackageName}");
            document.getElementsByTagName("head")[0].appendChild(css);
          }());`;
      }
      return `${importKey}${fromKey}'${resolvedPackageName}';`;
    }
  );
  return {
    code: result,
    fileMapping,
  };
};

let initializePromise: Promise<void> | null = null;

const initialize = async () => {
  if (!initializePromise) {
    initializePromise = esInitialize({
      // wasmModule: wasm,
      worker: false,
      wasmURL: "https://unpkg.com/esbuild-wasm@0.24.2/esbuild.wasm",
    });
  }
  return initializePromise;
};

export const browserBundle = async (
  code: string,
  filePath: string,
  options: Options = {}
) => {
  if (typeof window !== "undefined") {
    await initialize();
  }
  try {
    return await transformCode(code, filePath, options);
  } catch (e) {
    return {
      code: "",
      fileMapping: new Map<string, string>(),
      error: e,
    };
  }
};

export const revokeAllFileMapping = async (
  fileMapping: Map<string, string>
) => {
  for (const url of fileMapping.values()) {
    URL.revokeObjectURL(url);
  }
};
