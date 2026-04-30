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
var vscode3 = __toESM(require("vscode"));
var import_child_process = require("child_process");

// src/registers/RegistersProvider.ts
var vscode = __toESM(require("vscode"));
var RegisterItem = class extends vscode.TreeItem {
  constructor(reg) {
    super(reg.name, vscode.TreeItemCollapsibleState.None);
    this.reg = reg;
    this.description = `0x${(reg.value >>> 0).toString(16).padStart(8, "0")} (${reg.value})`;
    this.tooltip = `${reg.name}: ${reg.value}`;
  }
};
var RegistersProvider = class {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.registers = [];
  }
  getTreeItem(element) {
    return element;
  }
  getChildren() {
    return this.registers.map((reg) => new RegisterItem(reg));
  }
  setRegisters(registers) {
    this.registers = registers;
    this._onDidChangeTreeData.fire();
  }
  clear() {
    this.registers = [];
    this._onDidChangeTreeData.fire();
  }
};

// src/memory/MemoryProvider.ts
var vscode2 = __toESM(require("vscode"));
var MemoryItem = class extends vscode2.TreeItem {
  constructor(mem) {
    super(mem.address, vscode2.TreeItemCollapsibleState.None);
    this.mem = mem;
    this.description = `0x${(mem.value >>> 0).toString(16).padStart(8, "0")} (${mem.value})`;
    this.tooltip = `${mem.address}: ${mem.value}`;
  }
};
var MemoryProvider = class {
  constructor() {
    this._onDidChangeTreeData = new vscode2.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.memory = [];
  }
  getTreeItem(element) {
    return element;
  }
  getChildren() {
    return this.memory.map((m) => new MemoryItem(m));
  }
  // 👇 THIS is where setMemory goes
  setMemory(memory) {
    this.memory = memory;
    this._onDidChangeTreeData.fire();
  }
  clear() {
    this.memory = [];
    this._onDidChangeTreeData.fire();
  }
};

// src/extension.ts
var REGISTERS_TO_READ = [
  "zero",
  "at",
  "v0",
  "v1",
  "a0",
  "a1",
  "a2",
  "a3",
  "t0",
  "t1",
  "t2",
  "t3",
  "t4",
  "t5",
  "t6",
  "t7",
  "s0",
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "t8",
  "t9",
  "k0",
  "k1",
  "gp",
  "sp",
  "fp",
  "ra"
];
var MEMORY_RANGES_TO_READ = [
  "0x10010000-0x10010040"
];
function activate(context) {
  const output = vscode3.window.createOutputChannel("MARS");
  const registersProvider = new RegistersProvider();
  const memoryProvider = new MemoryProvider();
  vscode3.window.registerTreeDataProvider("marsRegistersView", registersProvider);
  vscode3.window.registerTreeDataProvider("marsMemoryView", memoryProvider);
  const helloWorld = vscode3.commands.registerCommand("mars-extension.helloWorld", () => {
    vscode3.window.showInformationMessage("Hello World from mars-extension!");
  });
  const runFile = vscode3.commands.registerCommand("mars-extension.runFile", async () => {
    const editor = vscode3.window.activeTextEditor;
    if (!editor) {
      vscode3.window.showErrorMessage("No active editor.");
      return;
    }
    const document = editor.document;
    if (document.uri.scheme !== "file") {
      vscode3.window.showErrorMessage("Please switch to a saved .asm file before running.");
      return;
    }
    if (document.isUntitled) {
      vscode3.window.showErrorMessage("Please save the file first.");
      return;
    }
    const filePath = document.uri.fsPath;
    if (!filePath.endsWith(".asm")) {
      vscode3.window.showErrorMessage("Please open a .asm file.");
      return;
    }
    await document.save();
    const config = vscode3.workspace.getConfiguration("mars-extension");
    const javaPath = config.get("javaPath", "java");
    const configuredJarPath = config.get("marsJarPath", "").trim();
    const bundledJarPath = vscode3.Uri.joinPath(
      context.extensionUri,
      "resources",
      "Mars4_5.jar"
    ).fsPath;
    const marsJarPath = configuredJarPath || bundledJarPath;
    output.clear();
    output.appendLine(`Running ${filePath}...`);
    output.appendLine(`Java: ${javaPath}`);
    output.appendLine(`Jar: ${marsJarPath}`);
    output.appendLine(`File: ${filePath}`);
    output.appendLine("");
    output.show(true);
    registersProvider.clear();
    memoryProvider.clear();
    const args = [
      "-jar",
      marsJarPath,
      "nc",
      "hex",
      "me",
      ...REGISTERS_TO_READ,
      ...MEMORY_RANGES_TO_READ,
      filePath
    ];
    output.appendLine(`Args: ${args.join(" ")}`);
    output.appendLine("");
    const child = (0, import_child_process.spawn)(javaPath, args);
    let programOutput = "";
    let marsOutput = "";
    child.stdout.on("data", (data) => {
      const text = data.toString();
      programOutput += text;
      output.append(text);
    });
    child.stderr.on("data", (data) => {
      const text = data.toString();
      marsOutput += text;
    });
    child.on("error", (error) => {
      output.appendLine(`
Failed to start MARS: ${error.message}`);
      vscode3.window.showErrorMessage(`Failed to start MARS: ${error.message}`);
    });
    child.on("close", (code) => {
      output.appendLine(`
Process exited with code ${code ?? "null"}`);
      const registers = parseMarsRegisters(marsOutput);
      const memory = parseMarsMemory(marsOutput);
      if (registers.length > 0) {
        registersProvider.setRegisters(registers);
      } else {
        output.appendLine("No register values were parsed from MARS messages.");
      }
      if (memory.length > 0) {
        memoryProvider.setMemory(memory);
      } else {
        output.appendLine("No memory values were parsed from MARS messages.");
      }
      if (registers.length === 0 && memory.length === 0) {
        output.appendLine("");
        vscode3.window.showWarningMessage(
          "MARS ran, but the register/memory dump format did not match the parser yet."
        );
      }
    });
  });
  context.subscriptions.push(helloWorld, runFile, output);
}
function deactivate() {
}
function parseMarsRegisters(output) {
  const registers = [];
  const seen = /* @__PURE__ */ new Set();
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    let match = trimmed.match(/^\$?([A-Za-z][A-Za-z0-9]*)\s*(?:=|:)?\s*(-?\d+)$/);
    if (match) {
      const name = `$${match[1]}`;
      const value = Number(match[2]);
      if (!seen.has(name)) {
        registers.push({ name, value });
        seen.add(name);
      }
      continue;
    }
    match = trimmed.match(/^\$?([A-Za-z][A-Za-z0-9]*)\s*(?:=|:)?\s*0x([0-9a-fA-F]+)$/);
    if (match) {
      const name = `$${match[1]}`;
      const value = parseInt(match[2], 16);
      if (!seen.has(name)) {
        registers.push({ name, value });
        seen.add(name);
      }
    }
  }
  return sortRegisters(registers);
}
function parseMarsMemory(output) {
  const memory = [];
  const seen = /* @__PURE__ */ new Set();
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(
      /^(0x[0-9a-fA-F]+)\s*(?::)?\s+(0x[0-9a-fA-F]+|-?\d+)$/
    );
    if (!match) {
      continue;
    }
    const address = match[1];
    const rawValue = match[2];
    if (seen.has(address)) {
      continue;
    }
    const value = rawValue.startsWith("0x") || rawValue.startsWith("0X") ? parseInt(rawValue, 16) : Number(rawValue);
    memory.push({
      address,
      value
    });
    seen.add(address);
  }
  return sortMemory(memory);
}
function sortRegisters(registers) {
  const order = [
    "$zero",
    "$at",
    "$v0",
    "$v1",
    "$a0",
    "$a1",
    "$a2",
    "$a3",
    "$t0",
    "$t1",
    "$t2",
    "$t3",
    "$t4",
    "$t5",
    "$t6",
    "$t7",
    "$s0",
    "$s1",
    "$s2",
    "$s3",
    "$s4",
    "$s5",
    "$s6",
    "$s7",
    "$t8",
    "$t9",
    "$k0",
    "$k1",
    "$gp",
    "$sp",
    "$fp",
    "$ra",
    "$pc",
    "$hi",
    "$lo"
  ];
  const orderMap = new Map(order.map((name, index) => [name, index]));
  return [...registers].sort((a, b) => {
    const aIndex = orderMap.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderMap.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex || a.name.localeCompare(b.name);
  });
}
function sortMemory(memory) {
  return [...memory].sort((a, b) => parseInt(a.address, 16) - parseInt(b.address, 16));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
