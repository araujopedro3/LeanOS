import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/") || (specifier.startsWith(".") && context.parentURL && !context.parentURL.includes("node_modules"))) {
      const base = specifier.startsWith("@/") ? resolve(root, specifier.slice(2)) : resolve(dirname(fileURLToPath(context.parentURL)), specifier);
      for (const file of [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`]) {
        if (existsSync(file) && /\.(ts|tsx|mjs)$/.test(file)) return { url: pathToFileURL(file).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url) && !url.includes("node_modules")) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 }, fileName: fileURLToPath(url) }).outputText;
      return { format: "module", source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
