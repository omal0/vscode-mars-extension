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
function formatValue(value, displayFormat = "both") {
  const hex = `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
  if (displayFormat === "hex") {
    return hex;
  }
  if (displayFormat === "dec") {
    return `${value}`;
  }
  return `${hex} (${value})`;
}
var RegisterItem = class extends vscode.TreeItem {
  constructor(reg) {
    super(reg.name, vscode.TreeItemCollapsibleState.None);
    this.reg = reg;
    const formattedValue = formatValue(reg.value, reg.displayFormat);
    this.description = formattedValue;
    this.tooltip = `${reg.name}: ${formattedValue}`;
    if (reg.changed) {
      this.label = `${reg.name} *`;
      this.description = `CHANGED  ${formattedValue}`;
      this.tooltip = `${reg.name}: ${formattedValue} (changed)`;
    }
  }
};
var RegistersProvider = class {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.registers = [];
    this.previousValues = /* @__PURE__ */ new Map();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren() {
    return this.registers.map((reg) => new RegisterItem(reg));
  }
  setRegisters(registers) {
    const nextRegisters = registers.map((reg) => {
      const previousValue = this.previousValues.get(reg.name);
      const changed = previousValue !== void 0 && previousValue !== reg.value;
      return {
        ...reg,
        changed
      };
    });
    this.registers = nextRegisters;
    this.previousValues.clear();
    for (const reg of registers) {
      this.previousValues.set(reg.name, reg.value);
    }
    this._onDidChangeTreeData.fire();
  }
  clear() {
    this.registers = [];
    this._onDidChangeTreeData.fire();
  }
};

// src/memory/MemoryProvider.ts
var vscode2 = __toESM(require("vscode"));
function formatValue2(value, displayFormat = "both") {
  const hex = `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
  if (displayFormat === "hex") {
    return hex;
  }
  if (displayFormat === "dec") {
    return `${value}`;
  }
  return `${hex} (${value})`;
}
var MemoryItem = class extends vscode2.TreeItem {
  constructor(mem) {
    super(mem.address, vscode2.TreeItemCollapsibleState.None);
    this.mem = mem;
    const formattedValue = formatValue2(mem.value, mem.displayFormat);
    this.description = formattedValue;
    this.tooltip = `${mem.address}: ${formattedValue}`;
    if (mem.changed) {
      this.label = `${mem.address} *`;
      this.description = `CHANGED  ${formattedValue}`;
      this.tooltip = `${mem.address}: ${formattedValue} (changed)`;
    }
  }
};
var MemoryProvider = class {
  constructor() {
    this._onDidChangeTreeData = new vscode2.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.memory = [];
    this.previousValues = /* @__PURE__ */ new Map();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren() {
    return this.memory.map((mem) => new MemoryItem(mem));
  }
  setMemory(memory) {
    const nextMemory = memory.map((mem) => {
      const previousValue = this.previousValues.get(mem.address);
      const changed = previousValue !== void 0 && previousValue !== mem.value;
      return {
        ...mem,
        changed
      };
    });
    this.memory = nextMemory;
    this.previousValues.clear();
    for (const mem of memory) {
      this.previousValues.set(mem.address, mem.value);
    }
    this._onDidChangeTreeData.fire();
  }
  clear() {
    this.memory = [];
    this._onDidChangeTreeData.fire();
  }
};

// src/extension.ts
var INSTRUCTION_HELP = {
  add: "`add $d, $s, $t`\n\nAdds two registers: `$d = $s + $t`.",
  addi: "`addi $t, $s, imm`\n\nAdds an immediate value: `$t = $s + imm`.",
  sub: "`sub $d, $s, $t`\n\nSubtracts registers: `$d = $s - $t`.",
  mul: "`mul $d, $s, $t`\n\nMultiplies registers: `$d = $s * $t`.",
  div: "`div $s, $t`\n\nDivides `$s / $t`. Quotient goes to `LO`, remainder goes to `HI`.",
  rem: "`rem $d, $s, $t`\n\nStores remainder: `$d = $s % $t`.",
  li: "`li $t, imm`\n\nLoads an immediate value into a register.",
  la: "`la $t, label`\n\nLoads the address of a label into a register.",
  move: "`move $d, $s`\n\nCopies one register into another.",
  lw: "`lw $t, offset($s)`\n\nLoads a word from memory.",
  sw: "`sw $t, offset($s)`\n\nStores a word into memory.",
  beq: "`beq $s, $t, label`\n\nBranches if `$s == $t`.",
  bne: "`bne $s, $t, label`\n\nBranches if `$s != $t`.",
  j: "`j label`\n\nJumps to a label.",
  jal: "`jal label`\n\nJumps to a label and saves return address in `$ra`.",
  jr: "`jr $ra`\n\nJumps to the address stored in a register.",
  syscall: "`syscall`\n\nRuns the system call selected by `$v0`.",
  nop: "`nop`\n\nNo operation."
};
var REGISTER_HELP = {
  "$zero": "Always contains `0`.",
  "$at": "Assembler temporary register.",
  "$v0": "Return value register / syscall code.",
  "$v1": "Return value register.",
  "$a0": "Argument register 0.",
  "$a1": "Argument register 1.",
  "$a2": "Argument register 2.",
  "$a3": "Argument register 3.",
  "$t0": "Temporary register.",
  "$t1": "Temporary register.",
  "$t2": "Temporary register.",
  "$t3": "Temporary register.",
  "$t4": "Temporary register.",
  "$t5": "Temporary register.",
  "$t6": "Temporary register.",
  "$t7": "Temporary register.",
  "$s0": "Saved register.",
  "$s1": "Saved register.",
  "$s2": "Saved register.",
  "$s3": "Saved register.",
  "$s4": "Saved register.",
  "$s5": "Saved register.",
  "$s6": "Saved register.",
  "$s7": "Saved register.",
  "$t8": "Temporary register.",
  "$t9": "Temporary register.",
  "$gp": "Global pointer.",
  "$sp": "Stack pointer.",
  "$fp": "Frame pointer.",
  "$ra": "Return address."
};
var DIRECTIVE_HELP = {
  ".data": "Starts the data segment.",
  ".text": "Starts the code/text segment.",
  ".globl": "Marks a label as globally visible.",
  ".word": "Stores one or more 32-bit values.",
  ".byte": "Stores one or more bytes.",
  ".space": "Reserves a number of bytes.",
  ".asciiz": "Stores a null-terminated string.",
  ".ascii": "Stores a string without a null terminator."
};
var SYSCALL_HELP = {
  "1": "Print integer. Uses `$a0`.",
  "4": "Print string. Uses `$a0` as string address.",
  "5": "Read integer. Result goes in `$v0`.",
  "8": "Read string. Uses `$a0` buffer address and `$a1` length.",
  "10": "Exit program.",
  "11": "Print character. Uses `$a0`."
};
var KNOWN_INSTRUCTIONS = /* @__PURE__ */ new Set([
  "add",
  "addu",
  "addi",
  "addiu",
  "sub",
  "subu",
  "mul",
  "div",
  "rem",
  "and",
  "andi",
  "or",
  "ori",
  "xor",
  "nor",
  "sll",
  "srl",
  "sra",
  "slt",
  "slti",
  "lw",
  "sw",
  "lb",
  "sb",
  "lh",
  "sh",
  "li",
  "la",
  "move",
  "mfhi",
  "mflo",
  "beq",
  "bne",
  "blt",
  "ble",
  "bgt",
  "bge",
  "j",
  "jal",
  "jr",
  "syscall",
  "nop"
]);
var DIRECTIVES = /* @__PURE__ */ new Set([
  ".data",
  ".text",
  ".globl",
  ".word",
  ".byte",
  ".half",
  ".space",
  ".asciiz",
  ".ascii",
  ".align"
]);
var BRANCH_OR_JUMP_INSTRUCTIONS = /* @__PURE__ */ new Set([
  "beq",
  "bne",
  "blt",
  "ble",
  "bgt",
  "bge",
  "j",
  "jal"
]);
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
function activate(context) {
  const output = vscode3.window.createOutputChannel("MARS");
  const registersProvider = new RegistersProvider();
  const memoryProvider = new MemoryProvider();
  vscode3.window.registerTreeDataProvider("marsRegistersView", registersProvider);
  vscode3.window.registerTreeDataProvider("marsMemoryView", memoryProvider);
  const helloWorld = vscode3.commands.registerCommand("mars-extension.helloWorld", () => {
    vscode3.window.showInformationMessage("Hello World from mars-extension!");
  });
  const hoverProvider = vscode3.languages.registerHoverProvider("mips", {
    provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, /[\.$]?[A-Za-z_][A-Za-z0-9_]*|[0-9]+/);
      if (!range) {
        return void 0;
      }
      const word = document.getText(range);
      if (INSTRUCTION_HELP[word]) {
        return new vscode3.Hover(new vscode3.MarkdownString(INSTRUCTION_HELP[word]), range);
      }
      if (REGISTER_HELP[word]) {
        return new vscode3.Hover(new vscode3.MarkdownString(REGISTER_HELP[word]), range);
      }
      if (DIRECTIVE_HELP[word]) {
        return new vscode3.Hover(new vscode3.MarkdownString(DIRECTIVE_HELP[word]), range);
      }
      const lineText = document.lineAt(position.line).text;
      const syscallMatch = lineText.match(/li\s+\$v0,\s*(\d+)/);
      if (syscallMatch && syscallMatch[1] === word && SYSCALL_HELP[word]) {
        return new vscode3.Hover(
          new vscode3.MarkdownString(`**Syscall ${word}**

${SYSCALL_HELP[word]}`),
          range
        );
      }
      return void 0;
    }
  });
  const completionProvider = vscode3.languages.registerCompletionItemProvider(
    "mips",
    {
      provideCompletionItems(document, position) {
        const completions = [];
        for (const [instruction, help] of Object.entries(INSTRUCTION_HELP)) {
          const item = new vscode3.CompletionItem(
            instruction,
            vscode3.CompletionItemKind.Function
          );
          item.detail = "MIPS instruction";
          item.documentation = new vscode3.MarkdownString(help);
          item.insertText = instruction;
          completions.push(item);
        }
        for (const [register, help] of Object.entries(REGISTER_HELP)) {
          const item = new vscode3.CompletionItem(
            register,
            vscode3.CompletionItemKind.Variable
          );
          item.detail = "MIPS register";
          item.documentation = new vscode3.MarkdownString(help);
          item.insertText = register;
          completions.push(item);
        }
        for (const [directive, help] of Object.entries(DIRECTIVE_HELP)) {
          const item = new vscode3.CompletionItem(
            directive,
            vscode3.CompletionItemKind.Keyword
          );
          item.detail = "MIPS directive";
          item.documentation = new vscode3.MarkdownString(help);
          item.insertText = directive;
          completions.push(item);
        }
        for (const [code, help] of Object.entries(SYSCALL_HELP)) {
          const item = new vscode3.CompletionItem(
            `syscall ${code}`,
            vscode3.CompletionItemKind.Value
          );
          item.detail = `Syscall ${code}`;
          item.documentation = new vscode3.MarkdownString(help);
          item.insertText = code;
          completions.push(item);
        }
        const labels = collectLabels(document);
        for (const label of labels) {
          const item = new vscode3.CompletionItem(
            label,
            vscode3.CompletionItemKind.Reference
          );
          item.detail = "MIPS label";
          item.insertText = label;
          completions.push(item);
        }
        return completions;
      }
    },
    "$",
    "."
  );
  context.subscriptions.push(completionProvider);
  context.subscriptions.push(hoverProvider);
  const diagnosticCollection = vscode3.languages.createDiagnosticCollection("mars");
  const marsDiagnostics = vscode3.languages.createDiagnosticCollection("mars");
  context.subscriptions.push(marsDiagnostics);
  function refreshStaticDiagnostics(document) {
    if (document.languageId !== "mips") {
      marsDiagnostics.delete(document.uri);
      return;
    }
    const diagnostics = collectStaticDiagnostics(document);
    marsDiagnostics.set(document.uri, diagnostics);
  }
  if (vscode3.window.activeTextEditor) {
    refreshStaticDiagnostics(vscode3.window.activeTextEditor.document);
  }
  context.subscriptions.push(
    vscode3.workspace.onDidOpenTextDocument(refreshStaticDiagnostics),
    vscode3.workspace.onDidChangeTextDocument((event) => {
      refreshStaticDiagnostics(event.document);
    }),
    vscode3.workspace.onDidCloseTextDocument((document) => {
      marsDiagnostics.delete(document.uri);
    })
  );
  function refreshDiagnostics(document) {
    if (document.languageId !== "mips") {
      diagnosticCollection.delete(document.uri);
      return;
    }
    const diagnostics = [];
    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);
      const textWithoutComment = line.text.split("#")[0].trim();
      if (!textWithoutComment) {
        continue;
      }
      let working = textWithoutComment;
      const labelMatch = working.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
      if (labelMatch) {
        working = labelMatch[2].trim();
        if (!working) {
          continue;
        }
      }
      const firstToken = working.split(/\s+/)[0];
      if (DIRECTIVES.has(firstToken)) {
        continue;
      }
      if (!KNOWN_INSTRUCTIONS.has(firstToken)) {
        const start = line.text.indexOf(firstToken);
        const range = new vscode3.Range(
          lineIndex,
          start,
          lineIndex,
          start + firstToken.length
        );
        diagnostics.push(
          new vscode3.Diagnostic(
            range,
            `Unknown MIPS instruction or directive: ${firstToken}`,
            vscode3.DiagnosticSeverity.Error
          )
        );
      }
    }
    diagnosticCollection.set(document.uri, diagnostics);
  }
  if (vscode3.window.activeTextEditor) {
    refreshDiagnostics(vscode3.window.activeTextEditor.document);
  }
  context.subscriptions.push(
    diagnosticCollection,
    vscode3.workspace.onDidOpenTextDocument(refreshDiagnostics),
    vscode3.workspace.onDidChangeTextDocument((event) => {
      refreshDiagnostics(event.document);
    }),
    vscode3.workspace.onDidCloseTextDocument((document) => {
      diagnosticCollection.delete(document.uri);
    })
  );
  const debugConfigProvider = vscode3.debug.registerDebugConfigurationProvider("mars", {
    resolveDebugConfiguration(folder, config) {
      if (!config.type) {
        config.type = "mars";
      }
      if (!config.name) {
        config.name = "Debug MIPS with MARS";
      }
      if (!config.request) {
        config.request = "launch";
      }
      if (!config.program) {
        const editor = vscode3.window.activeTextEditor;
        if (editor) {
          config.program = editor.document.uri.fsPath;
        }
      }
      return config;
    }
  });
  context.subscriptions.push(debugConfigProvider);
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
    marsDiagnostics.delete(document.uri);
    if (!filePath.endsWith(".asm")) {
      vscode3.window.showErrorMessage("Please open a .asm file.");
      return;
    }
    await document.save();
    const config = vscode3.workspace.getConfiguration("mars-extension");
    const memoryStart = config.get("memoryStartAddress", "0x10010000");
    const memoryEnd = config.get("memoryEndAddress", "0x10010040");
    const memoryRange = `${memoryStart}-${memoryEnd}`;
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
      ...memoryRange,
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
      marsOutput += data.toString();
    });
    child.on("error", (error) => {
      output.appendLine(`
Failed to start MARS: ${error.message}`);
      vscode3.window.showErrorMessage(`Failed to start MARS: ${error.message}`);
    });
    child.on("close", (code) => {
      output.appendLine(`
Process exited with code ${code ?? "null"}`);
      const errors = parseMarsErrors(marsOutput, document);
      const staticDiagnostics = collectStaticDiagnostics(document);
      const marsErrors = parseMarsErrors(marsOutput, document);
      const displayFormat = config.get("displayFormat", "both");
      const registers = parseMarsRegisters(marsOutput).map((reg) => ({
        ...reg,
        displayFormat
      }));
      const memory = parseMarsMemory(marsOutput).map((mem) => ({
        ...mem,
        displayFormat
      }));
      marsDiagnostics.set(document.uri, [
        ...staticDiagnostics,
        ...marsErrors
      ]);
      if (errors.length > 0) {
        marsDiagnostics.set(document.uri, errors);
        vscode3.window.showErrorMessage(`MARS found ${errors.length} error(s).`);
      } else {
        marsDiagnostics.delete(document.uri);
      }
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
  const debugAdapterFactory = vscode3.debug.registerDebugAdapterDescriptorFactory("mars", {
    createDebugAdapterDescriptor() {
      return new vscode3.DebugAdapterExecutable("node", [
        context.asAbsolutePath("dist/debugAdapter.js")
      ]);
    }
  });
  context.subscriptions.push(debugAdapterFactory);
  context.subscriptions.push(helloWorld, runFile, output, debugAdapterFactory);
}
function deactivate() {
}
function collectStaticDiagnostics(document) {
  const diagnostics = [];
  const labels = /* @__PURE__ */ new Map();
  const labelUses = [];
  for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
    const line = document.lineAt(lineIndex);
    const noComment = line.text.split("#")[0];
    let working = noComment.trim();
    if (!working) {
      continue;
    }
    const labelMatch = working.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (labelMatch) {
      const label = labelMatch[1];
      const labelStart = line.text.indexOf(label);
      const labelRange = new vscode3.Range(
        lineIndex,
        labelStart,
        lineIndex,
        labelStart + label.length
      );
      if (labels.has(label)) {
        diagnostics.push(
          new vscode3.Diagnostic(
            labelRange,
            `Duplicate label: ${label}`,
            vscode3.DiagnosticSeverity.Error
          )
        );
      } else {
        labels.set(label, labelRange);
      }
      working = labelMatch[2].trim();
      if (!working) {
        continue;
      }
    }
    const firstToken = working.split(/\s+/)[0];
    if (DIRECTIVES.has(firstToken)) {
      continue;
    }
    if (!KNOWN_INSTRUCTIONS.has(firstToken)) {
      const start = line.text.indexOf(firstToken);
      const range = new vscode3.Range(
        lineIndex,
        start,
        lineIndex,
        start + firstToken.length
      );
      diagnostics.push(
        new vscode3.Diagnostic(
          range,
          `Unknown MIPS instruction or directive: ${firstToken}`,
          vscode3.DiagnosticSeverity.Error
        )
      );
      continue;
    }
    if (BRANCH_OR_JUMP_INSTRUCTIONS.has(firstToken)) {
      const possibleLabel = getPossibleBranchLabel(firstToken, working);
      if (possibleLabel) {
        const labelStart = line.text.indexOf(possibleLabel);
        const range = new vscode3.Range(
          lineIndex,
          labelStart,
          lineIndex,
          labelStart + possibleLabel.length
        );
        labelUses.push({
          label: possibleLabel,
          range
        });
      }
    }
  }
  for (const use of labelUses) {
    if (!labels.has(use.label)) {
      diagnostics.push(
        new vscode3.Diagnostic(
          use.range,
          `Undefined label: ${use.label}`,
          vscode3.DiagnosticSeverity.Error
        )
      );
    }
  }
  return diagnostics;
}
function collectLabels(document) {
  const labels = [];
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text.split("#")[0];
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*):/);
    if (match) {
      labels.push(match[1]);
    }
  }
  return labels;
}
function getPossibleBranchLabel(instruction, line) {
  const withoutInstruction = line.slice(instruction.length).trim();
  const parts = withoutInstruction.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return void 0;
  }
  if (instruction === "j" || instruction === "jal") {
    return parts[0];
  }
  return parts[parts.length - 1];
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
    const addressMatch = trimmed.match(/0x[0-9a-fA-F]{8}/);
    if (!addressMatch) {
      continue;
    }
    const address = addressMatch[0];
    const hexWords = trimmed.match(/0x[0-9a-fA-F]{1,8}/g) ?? [];
    let valueHex;
    for (const word of hexWords) {
      if (word.toLowerCase() !== address.toLowerCase()) {
        valueHex = word;
        break;
      }
    }
    if (!valueHex || seen.has(address)) {
      continue;
    }
    memory.push({
      address,
      value: parseInt(valueHex, 16)
    });
    seen.add(address);
  }
  return sortMemory(memory);
}
function parseMarsErrors(output, document) {
  const diagnostics = [];
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/line\s+(\d+)\s+column\s+(\d+)\s*:\s*(.*)$/i) || trimmed.match(/line\s+(\d+)\s*:\s*(.*)$/i);
    if (!match) {
      continue;
    }
    const lineNumber = Number(match[1]);
    const columnNumber = match.length >= 4 ? Number(match[2]) : 1;
    const message = match.length >= 4 ? match[3] : match[2];
    const zeroBasedLine = Math.max(0, lineNumber - 1);
    const zeroBasedColumn = Math.max(0, columnNumber - 1);
    if (zeroBasedLine >= document.lineCount) {
      continue;
    }
    const textLine = document.lineAt(zeroBasedLine);
    const startChar = Math.min(zeroBasedColumn, textLine.text.length);
    const endChar = Math.min(startChar + 1, textLine.text.length);
    const range = new vscode3.Range(
      zeroBasedLine,
      startChar,
      zeroBasedLine,
      endChar
    );
    diagnostics.push(
      new vscode3.Diagnostic(
        range,
        message || trimmed,
        vscode3.DiagnosticSeverity.Error
      )
    );
  }
  return diagnostics;
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
