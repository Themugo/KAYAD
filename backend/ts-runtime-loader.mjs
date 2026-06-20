import { readFile } from "node:fs/promises";
import ts from "typescript";

const compilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  sourceMap: false,
};

export async function load(url, context, nextLoad) {
  if (!url.endsWith(".ts")) {
    return nextLoad(url, context);
  }

  const source = await readFile(new URL(url), "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions,
    fileName: new URL(url).pathname,
  });

  return {
    format: "module",
    shortCircuit: true,
    source: result.outputText,
  };
}
