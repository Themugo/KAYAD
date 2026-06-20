// Render starts this file with plain `node server.js`.
// Register the local TypeScript ESM loader before importing the app entrypoint.
import { readFileSync } from "node:fs";
import * as module from "node:module";
import ts from "typescript";

const transpile = (url) => {
  const source = readFileSync(new URL(url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      sourceMap: false,
    },
    fileName: new URL(url).pathname,
  }).outputText;
};

if (typeof module.registerHooks === "function") {
  module.registerHooks({
    load(url, context, nextLoad) {
      if (!url.endsWith(".ts")) {
        return nextLoad(url, context);
      }

      return {
        format: "module",
        shortCircuit: true,
        source: transpile(url),
      };
    },
  });
} else {
  module.register("./ts-runtime-loader.mjs", import.meta.url);
}

await import("./server.ts");
