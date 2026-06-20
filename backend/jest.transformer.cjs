const ts = require("typescript");

module.exports = {
  process(sourceText, sourcePath) {
    if (!sourcePath.endsWith(".ts")) {
      return { code: sourceText };
    }

    const result = ts.transpileModule(sourceText, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        sourceMap: false,
      },
      fileName: sourcePath,
    });

    return { code: result.outputText };
  },
};
