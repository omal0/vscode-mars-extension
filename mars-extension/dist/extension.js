"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var import_node_child_process = require("node:child_process");
function activate(context) {
  const output = vscode.window.createOutputChannel("MARS");
  const helloWorld = vscode.commands.registerCommand("mars-extension.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from mars-extension!");
  });
  const runFile = vscode.commands.registerCommand("mars-extension.runFile", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor.");
      return;
    }
    const document = editor.document;
    if (document.uri.scheme !== "file") {
      vscode.window.showErrorMessage("Please switch to a saved .asm file before running.");
      return;
    }
    if (document.isUntitled) {
      vscode.window.showErrorMessage("Please save the file first.");
      return;
    }
    const filePath = document.uri.fsPath;
    if (!filePath.endsWith(".asm")) {
      vscode.window.showErrorMessage("Please open a .asm file.");
      return;
    }
    await document.save();
    const config = vscode.workspace.getConfiguration("mars-extension");
    const javaPath = config.get("javaPath", "java");
    const marsJarPath = vscode.Uri.joinPath(
      context.extensionUri,
      "resources",
      "Mars4_5.jar"
    ).fsPath;
    output.clear();
    output.appendLine(`Running ${filePath}...`);
    output.appendLine(`Jar: ${marsJarPath}`);
    output.appendLine(`File: ${filePath}`);
    output.appendLine("");
    output.show(true);
    const child = (0, import_node_child_process.spawn)(javaPath, ["-jar", marsJarPath, "nc", filePath]);
    child.stdout.on("data", (data) => {
      output.append(data.toString());
    });
    child.stderr.on("data", (data) => {
      output.append(data.toString());
    });
    child.on("error", (error) => {
      output.appendLine(`
Failed to start MARS: ${error.message}`);
      vscode.window.showErrorMessage("Failed to start MARS.");
    });
    child.on("close", (code) => {
      output.appendLine(`
Process exited with code ${code ?? "null"}`);
    });
  });
  context.subscriptions.push(helloWorld, runFile, output);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
