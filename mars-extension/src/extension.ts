import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import { RegistersProvider } from './registers/RegistersProvider';
import type { RegisterValue } from './registers/RegistersProvider';
import { MemoryProvider } from './memory/MemoryProvider';
import type { MemoryValue } from './memory/MemoryProvider';

let registerPanel: vscode.WebviewPanel | undefined;

type DisplayFormat = 'hex' | 'dec' | 'both';

const REGISTERS_TO_READ = [
	'zero', 'at',
	'v0', 'v1',
	'a0', 'a1', 'a2', 'a3',
	't0', 't1', 't2', 't3', 't4', 't5', 't6', 't7',
	's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7',
	't8', 't9',
	'k0', 'k1',
	'gp', 'sp', 'fp', 'ra'
];

const INSTRUCTION_HELP: Record<string, string> = {
	add: '`add $d, $s, $t`\n\nAdds two registers: `$d = $s + $t`.',
	addi: '`addi $t, $s, imm`\n\nAdds an immediate value: `$t = $s + imm`.',
	sub: '`sub $d, $s, $t`\n\nSubtracts registers: `$d = $s - $t`.',
	mul: '`mul $d, $s, $t`\n\nMultiplies registers: `$d = $s * $t`.',
	div: '`div $s, $t`\n\nDivides `$s / $t`. Quotient goes to `LO`, remainder goes to `HI`.',
	rem: '`rem $d, $s, $t`\n\nStores remainder: `$d = $s % $t`.',
	li: '`li $t, imm`\n\nLoads an immediate value into a register.',
	la: '`la $t, label`\n\nLoads the address of a label into a register.',
	move: '`move $d, $s`\n\nCopies one register into another.',
	lw: '`lw $t, offset($s)`\n\nLoads a word from memory.',
	sw: '`sw $t, offset($s)`\n\nStores a word into memory.',
	beq: '`beq $s, $t, label`\n\nBranches if `$s == $t`.',
	bne: '`bne $s, $t, label`\n\nBranches if `$s != $t`.',
	j: '`j label`\n\nJumps to a label.',
	jal: '`jal label`\n\nJumps to a label and saves return address in `$ra`.',
	jr: '`jr $ra`\n\nJumps to the address stored in a register.',
	syscall: '`syscall`\n\nRuns the system call selected by `$v0`.',
	nop: '`nop`\n\nNo operation.'
};

const REGISTER_HELP: Record<string, string> = {
	'$zero': 'Always contains `0`.',
	'$at': 'Assembler temporary register.',
	'$v0': 'Return value register / syscall code.',
	'$v1': 'Return value register.',
	'$a0': 'Argument register 0.',
	'$a1': 'Argument register 1.',
	'$a2': 'Argument register 2.',
	'$a3': 'Argument register 3.',
	'$t0': 'Temporary register.',
	'$t1': 'Temporary register.',
	'$t2': 'Temporary register.',
	'$t3': 'Temporary register.',
	'$t4': 'Temporary register.',
	'$t5': 'Temporary register.',
	'$t6': 'Temporary register.',
	'$t7': 'Temporary register.',
	'$s0': 'Saved register.',
	'$s1': 'Saved register.',
	'$s2': 'Saved register.',
	'$s3': 'Saved register.',
	'$s4': 'Saved register.',
	'$s5': 'Saved register.',
	'$s6': 'Saved register.',
	'$s7': 'Saved register.',
	'$t8': 'Temporary register.',
	'$t9': 'Temporary register.',
	'$gp': 'Global pointer.',
	'$sp': 'Stack pointer.',
	'$fp': 'Frame pointer.',
	'$ra': 'Return address.'
};

const DIRECTIVE_HELP: Record<string, string> = {
	'.data': 'Starts the data segment.',
	'.text': 'Starts the code/text segment.',
	'.globl': 'Marks a label as globally visible.',
	'.word': 'Stores one or more 32-bit values.',
	'.byte': 'Stores one or more bytes.',
	'.half': 'Stores one or more 16-bit values.',
	'.space': 'Reserves a number of bytes.',
	'.asciiz': 'Stores a null-terminated string.',
	'.ascii': 'Stores a string without a null terminator.',
	'.align': 'Aligns the next data item.'
};

const SYSCALL_HELP: Record<string, string> = {
	'1': 'Print integer. Uses `$a0`.',
	'4': 'Print string. Uses `$a0` as string address.',
	'5': 'Read integer. Result goes in `$v0`.',
	'8': 'Read string. Uses `$a0` buffer address and `$a1` length.',
	'10': 'Exit program.',
	'11': 'Print character. Uses `$a0`.'
};

const KNOWN_INSTRUCTIONS = new Set(Object.keys(INSTRUCTION_HELP).concat([
	'addu', 'addiu', 'subu', 'and', 'andi', 'or', 'ori', 'xor', 'nor',
	'sll', 'srl', 'sra', 'slt', 'slti', 'lb', 'sb', 'lh', 'sh', 'mfhi', 'mflo',
	'blt', 'ble', 'bgt', 'bge'
]));

const DIRECTIVES = new Set(Object.keys(DIRECTIVE_HELP));

const BRANCH_OR_JUMP_INSTRUCTIONS = new Set([
	'beq', 'bne', 'blt', 'ble', 'bgt', 'bge', 'j', 'jal'
]);

export function activate(context: vscode.ExtensionContext) {
	const output = vscode.window.createOutputChannel('MARS');
	const registersProvider = new RegistersProvider();
	const memoryProvider = new MemoryProvider();
	const marsDiagnostics = vscode.languages.createDiagnosticCollection('mars');

	vscode.window.registerTreeDataProvider('marsRegistersView', registersProvider);
	vscode.window.registerTreeDataProvider('marsMemoryView', memoryProvider);

	const helloWorld = vscode.commands.registerCommand('mars-extension.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from mars-extension!');
	});

	const showRegisters = vscode.commands.registerCommand('mars-extension.showRegisters', () => {
		showRegisterPanel();
	});

	const runFile = vscode.commands.registerCommand('mars-extension.runFile', async () => {
		await runMarsFile(context, output, registersProvider, memoryProvider, marsDiagnostics);
	});

	const runWithInput = vscode.commands.registerCommand('mars-extension.runWithInput', async () => {
		const input = await vscode.window.showInputBox({
			prompt: 'Enter stdin input for your MIPS program',
			placeHolder: 'e.g. 42 or 5 10 15'
		});

		if (input === undefined) {
			return;
		}

		await runMarsFile(context, output, registersProvider, memoryProvider, marsDiagnostics, input + '\n');
	});

	const hoverProvider = vscode.languages.registerHoverProvider('mips', {
		provideHover(document, position) {
			const range = document.getWordRangeAtPosition(position, /[\.$]?[A-Za-z_][A-Za-z0-9_]*|[0-9]+/);
			if (!range) {
				return undefined;
			}

			const word = document.getText(range);

			if (INSTRUCTION_HELP[word]) {
				return new vscode.Hover(new vscode.MarkdownString(INSTRUCTION_HELP[word]), range);
			}

			if (REGISTER_HELP[word]) {
				return new vscode.Hover(new vscode.MarkdownString(REGISTER_HELP[word]), range);
			}

			if (DIRECTIVE_HELP[word]) {
				return new vscode.Hover(new vscode.MarkdownString(DIRECTIVE_HELP[word]), range);
			}

			const lineText = document.lineAt(position.line).text;
			const syscallMatch = lineText.match(/li\s+\$v0,\s*(\d+)/);

			if (syscallMatch && syscallMatch[1] === word && SYSCALL_HELP[word]) {
				return new vscode.Hover(
					new vscode.MarkdownString(`**Syscall ${word}**\n\n${SYSCALL_HELP[word]}`),
					range
				);
			}

			return undefined;
		}
	});

	const completionProvider = vscode.languages.registerCompletionItemProvider(
		'mips',
		{
			provideCompletionItems(document) {
				const completions: vscode.CompletionItem[] = [];

				for (const [instruction, help] of Object.entries(INSTRUCTION_HELP)) {
					const item = new vscode.CompletionItem(instruction, vscode.CompletionItemKind.Function);
					item.detail = 'MIPS instruction';
					item.documentation = new vscode.MarkdownString(help);
					item.insertText = getInstructionSnippet(instruction);
					completions.push(item);
				}

				for (const [register, help] of Object.entries(REGISTER_HELP)) {
					const item = new vscode.CompletionItem(register, vscode.CompletionItemKind.Variable);
					item.detail = 'MIPS register';
					item.documentation = new vscode.MarkdownString(help);
					item.insertText = register;
					completions.push(item);
				}

				for (const [directive, help] of Object.entries(DIRECTIVE_HELP)) {
					const item = new vscode.CompletionItem(directive, vscode.CompletionItemKind.Keyword);
					item.detail = 'MIPS directive';
					item.documentation = new vscode.MarkdownString(help);
					item.insertText = directive;
					completions.push(item);
				}

				for (const [code, help] of Object.entries(SYSCALL_HELP)) {
					const item = new vscode.CompletionItem(`syscall ${code}`, vscode.CompletionItemKind.Value);
					item.detail = `Syscall ${code}`;
					item.documentation = new vscode.MarkdownString(help);
					item.insertText = code;
					completions.push(item);
				}

				for (const label of collectLabels(document)) {
					const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Reference);
					item.detail = 'MIPS label';
					item.insertText = label;
					completions.push(item);
				}

				return completions;
			}
		},
		'$',
		'.'
	);

	function refreshStaticDiagnostics(document: vscode.TextDocument) {
		if (document.languageId !== 'mips') {
			marsDiagnostics.delete(document.uri);
			return;
		}

		marsDiagnostics.set(document.uri, collectStaticDiagnostics(document));
	}

	if (vscode.window.activeTextEditor) {
		refreshStaticDiagnostics(vscode.window.activeTextEditor.document);
	}

	const debugConfigProvider = vscode.debug.registerDebugConfigurationProvider('mars', {
		resolveDebugConfiguration(folder, config) {
			if (!config.type) {
				config.type = 'mars';
			}

			if (!config.name) {
				config.name = 'Debug MIPS with MARS';
			}

			if (!config.request) {
				config.request = 'launch';
			}

			if (!config.program) {
				const editor = vscode.window.activeTextEditor;
				if (editor) {
					config.program = editor.document.uri.fsPath;
				}
			}

			return config;
		}
	});

	const debugAdapterFactory = vscode.debug.registerDebugAdapterDescriptorFactory('mars', {
		createDebugAdapterDescriptor() {
			return new vscode.DebugAdapterExecutable('node', [
				context.asAbsolutePath('dist/debugAdapter.js')
			]);
		}
	});

	context.subscriptions.push(
		helloWorld,
		showRegisters,
		runFile,
		runWithInput,
		output,
		marsDiagnostics,
		hoverProvider,
		completionProvider,
		debugConfigProvider,
		debugAdapterFactory,
		vscode.workspace.onDidOpenTextDocument(refreshStaticDiagnostics),
		vscode.workspace.onDidChangeTextDocument((event) => refreshStaticDiagnostics(event.document)),
		vscode.workspace.onDidCloseTextDocument((document) => marsDiagnostics.delete(document.uri))
	);
}

export function deactivate() {}

async function runMarsFile(
	context: vscode.ExtensionContext,
	output: vscode.OutputChannel,
	registersProvider: RegistersProvider,
	memoryProvider: MemoryProvider,
	marsDiagnostics: vscode.DiagnosticCollection,
	stdinInput?: string
) {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		vscode.window.showErrorMessage('No active editor.');
		return;
	}

	const document = editor.document;

	if (document.uri.scheme !== 'file') {
		vscode.window.showErrorMessage('Please switch to a saved .asm file before running.');
		return;
	}

	if (document.isUntitled) {
		vscode.window.showErrorMessage('Please save the file first.');
		return;
	}

	const filePath = document.uri.fsPath;

	if (!filePath.endsWith('.asm') && !filePath.endsWith('.s')) {
		vscode.window.showErrorMessage('Please open a .asm or .s file.');
		return;
	}

	await document.save();

	const config = vscode.workspace.getConfiguration('mars-extension');
	const javaPath = config.get<string>('javaPath', 'java');
	const configuredJarPath = config.get<string>('marsJarPath', '').trim();
	const displayFormat = config.get<DisplayFormat>('displayFormat', 'both');
	const memoryStart = config.get<string>('memoryStartAddress', '0x10010000');
	const memoryEnd = config.get<string>('memoryEndAddress', '0x10010040');
	const memoryRange = `${memoryStart}-${memoryEnd}`;

	const bundledJarPath = vscode.Uri.joinPath(
		context.extensionUri,
		'resources',
		'Mars4_5.jar'
	).fsPath;

	const marsJarPath = configuredJarPath || bundledJarPath;

	if (!fs.existsSync(marsJarPath)) {
		vscode.window.showErrorMessage(`Mars4_5.jar not found at: ${marsJarPath}`);
		return;
	}

	marsDiagnostics.delete(document.uri);

	output.clear();
	output.appendLine(`▶ Running: ${path.basename(filePath)}`);
	output.appendLine(`JAR : ${marsJarPath}`);
	output.appendLine(`Java: ${javaPath}`);
	output.appendLine('─'.repeat(50));
	output.show(true);

	registersProvider.clear();
	memoryProvider.clear();

	const args = [
		'-jar',
		marsJarPath,
		'nc',
		'hex',
		'me',
		...REGISTERS_TO_READ,
		memoryRange,
		filePath
	];

	const child = spawn(javaPath, args);

	if (stdinInput !== undefined) {
		child.stdin.write(stdinInput);
		child.stdin.end();
	}

	let marsOutput = '';

	child.stdout.on('data', (data: Buffer) => {
		output.append(data.toString());
	});

	child.stderr.on('data', (data: Buffer) => {
		marsOutput += data.toString();
	});

	child.on('error', (error: Error) => {
		output.appendLine(`\nFailed to start MARS: ${error.message}`);
		vscode.window.showErrorMessage(`Failed to start MARS: ${error.message}`);
	});

	child.on('close', (code: number | null) => {
		output.appendLine('─'.repeat(50));
		output.appendLine(`Process exited with code ${code ?? 'null'}`);

		const staticDiagnostics = collectStaticDiagnostics(document);
		const marsErrors = parseMarsErrors(marsOutput, document);
		const allDiagnostics = [...staticDiagnostics, ...marsErrors];

		marsDiagnostics.set(document.uri, allDiagnostics);

		if (marsErrors.length > 0) {
			vscode.window.showErrorMessage(`MARS found ${marsErrors.length} error(s).`);
		}

		const registers = parseMarsRegisters(marsOutput).map((reg) => ({
			...reg,
			displayFormat
		}));

		const memory = parseMarsMemory(marsOutput).map((mem) => ({
			...mem,
			displayFormat
		}));

		if (registers.length > 0) {
			registersProvider.setRegisters(registers);

			if (registerPanel) {
				registerPanel.webview.postMessage({
					type: 'registers',
					data: registers
				});
			}
		} else {
			output.appendLine('No register values were parsed from MARS messages.');
		}

		if (memory.length > 0) {
			memoryProvider.setMemory(memory);
		} else {
			output.appendLine('No memory values were parsed from MARS messages.');
		}

		if (registers.length === 0 && memory.length === 0) {
			vscode.window.showWarningMessage(
				'MARS ran, but the register/memory dump format did not match the parser.'
			);
		}
	});
}

function showRegisterPanel() {
	if (registerPanel) {
		registerPanel.reveal(vscode.ViewColumn.Two);
		return;
	}

	registerPanel = vscode.window.createWebviewPanel(
		'marsRegisters',
		'MARS Register State',
		vscode.ViewColumn.Two,
		{ enableScripts: true }
	);

	registerPanel.webview.html = getRegisterHtml();

	registerPanel.onDidDispose(() => {
		registerPanel = undefined;
	});
}

function getRegisterHtml(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
	body {
		font-family: var(--vscode-editor-font-family);
		background: var(--vscode-editor-background);
		color: var(--vscode-editor-foreground);
		padding: 12px;
	}
	h2 {
		color: var(--vscode-textLink-foreground);
		margin-bottom: 12px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}
	th {
		background: var(--vscode-editorGroupHeader-tabsBackground);
		color: var(--vscode-symbolIcon-variableForeground);
		padding: 6px 10px;
		text-align: left;
		border-bottom: 1px solid var(--vscode-panel-border);
	}
	td {
		padding: 5px 10px;
		border-bottom: 1px solid var(--vscode-panel-border);
	}
	tr:hover td {
		background: var(--vscode-list-hoverBackground);
	}
	.val {
		color: var(--vscode-debugTokenExpression-number);
	}
	.changed td {
		background: rgba(255, 204, 0, 0.12);
	}
	#placeholder {
		color: var(--vscode-descriptionForeground);
		margin-top: 20px;
	}
</style>
</head>
<body>
	<h2>⚙ MARS Register State</h2>

	<p id="placeholder">Run a .asm file to see register values here.</p>

	<table id="regTable" style="display:none">
		<thead>
			<tr>
				<th>Register</th>
				<th>Value (dec)</th>
				<th>Value (hex)</th>
			</tr>
		</thead>
		<tbody id="regBody"></tbody>
	</table>

	<script>
		window.addEventListener('message', event => {
			const msg = event.data;

			if (msg.type !== 'registers') {
				return;
			}

			const tbody = document.getElementById('regBody');
			const table = document.getElementById('regTable');
			const placeholder = document.getElementById('placeholder');

			tbody.innerHTML = '';

			msg.data.forEach(r => {
				const hex = '0x' + (r.value >>> 0).toString(16).padStart(8, '0');
				const changedClass = r.changed ? 'changed' : '';

				tbody.innerHTML += \`
					<tr class="\${changedClass}">
						<td>\${r.name}</td>
						<td class="val">\${r.value}</td>
						<td class="val">\${hex}</td>
					</tr>
				\`;
			});

			table.style.display = 'table';
			placeholder.style.display = 'none';
		});
	</script>
</body>
</html>`;
}

function getInstructionSnippet(instruction: string): string | vscode.SnippetString {
	switch (instruction) {
		case 'addi':
			return new vscode.SnippetString('addi ${1:$t0}, ${2:$t0}, ${3:1}');
		case 'lw':
			return new vscode.SnippetString('lw ${1:$t0}, ${2:0}(${3:$sp})');
		case 'sw':
			return new vscode.SnippetString('sw ${1:$t0}, ${2:0}(${3:$sp})');
		case 'beq':
			return new vscode.SnippetString('beq ${1:$t0}, ${2:$t1}, ${3:label}');
		case 'bne':
			return new vscode.SnippetString('bne ${1:$t0}, ${2:$t1}, ${3:label}');
		case 'li':
			return new vscode.SnippetString('li ${1:$v0}, ${2:1}');
		case 'la':
			return new vscode.SnippetString('la ${1:$a0}, ${2:label}');
		default:
			return instruction;
	}
}

function collectLabels(document: vscode.TextDocument): string[] {
	const labels: string[] = [];

	for (let i = 0; i < document.lineCount; i++) {
		const line = document.lineAt(i).text.split('#')[0];
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*):/);

		if (match) {
			labels.push(match[1]);
		}
	}

	return labels;
}

function collectStaticDiagnostics(document: vscode.TextDocument): vscode.Diagnostic[] {
	const diagnostics: vscode.Diagnostic[] = [];
	const labels = new Map<string, vscode.Range>();
	const labelUses: { label: string; range: vscode.Range }[] = [];

	for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
		const line = document.lineAt(lineIndex);
		const noComment = line.text.split('#')[0];

		let working = noComment.trim();
		if (!working) {
			continue;
		}

		const labelMatch = working.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
		if (labelMatch) {
			const label = labelMatch[1];
			const labelStart = line.text.indexOf(label);
			const labelRange = new vscode.Range(lineIndex, labelStart, lineIndex, labelStart + label.length);

			if (labels.has(label)) {
				diagnostics.push(new vscode.Diagnostic(
					labelRange,
					`Duplicate label: ${label}`,
					vscode.DiagnosticSeverity.Error
				));
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
			const range = new vscode.Range(lineIndex, start, lineIndex, start + firstToken.length);

			diagnostics.push(new vscode.Diagnostic(
				range,
				`Unknown MIPS instruction or directive: ${firstToken}`,
				vscode.DiagnosticSeverity.Error
			));

			continue;
		}

		if (BRANCH_OR_JUMP_INSTRUCTIONS.has(firstToken)) {
			const possibleLabel = getPossibleBranchLabel(firstToken, working);

			if (possibleLabel) {
				const labelStart = line.text.indexOf(possibleLabel);
				const range = new vscode.Range(lineIndex, labelStart, lineIndex, labelStart + possibleLabel.length);

				labelUses.push({ label: possibleLabel, range });
			}
		}
	}

	for (const use of labelUses) {
		if (!labels.has(use.label)) {
			diagnostics.push(new vscode.Diagnostic(
				use.range,
				`Undefined label: ${use.label}`,
				vscode.DiagnosticSeverity.Error
			));
		}
	}

	return diagnostics;
}

function getPossibleBranchLabel(instruction: string, line: string): string | undefined {
	const withoutInstruction = line.slice(instruction.length).trim();
	const parts = withoutInstruction.split(',').map((part) => part.trim()).filter(Boolean);

	if (parts.length === 0) {
		return undefined;
	}

	if (instruction === 'j' || instruction === 'jal') {
		return parts[0];
	}

	return parts[parts.length - 1];
}

function parseMarsRegisters(output: string): RegisterValue[] {
	const registers: RegisterValue[] = [];
	const seen = new Set<string>();
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

function parseMarsMemory(output: string): MemoryValue[] {
	const memory: MemoryValue[] = [];
	const seen = new Set<string>();
	const lines = output.split(/\r?\n/);

	for (const line of lines) {
		const trimmed = line.trim();
		const addressMatch = trimmed.match(/0x[0-9a-fA-F]{8}/);

		if (!addressMatch) {
			continue;
		}

		const address = addressMatch[0];
		const hexWords = trimmed.match(/0x[0-9a-fA-F]{1,8}/g) ?? [];

		let valueHex: string | undefined;
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

function parseMarsErrors(output: string, document: vscode.TextDocument): vscode.Diagnostic[] {
	const diagnostics: vscode.Diagnostic[] = [];
	const lines = output.split(/\r?\n/);

	for (const line of lines) {
		const trimmed = line.trim();

		const match =
			trimmed.match(/line\s+(\d+)\s+column\s+(\d+)\s*:\s*(.*)$/i) ||
			trimmed.match(/line\s+(\d+)\s*:\s*(.*)$/i);

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
		const range = document.getWordRangeAtPosition(
			new vscode.Position(zeroBasedLine, startChar)
		) ?? new vscode.Range(
			zeroBasedLine,
			startChar,
			zeroBasedLine,
			Math.min(startChar + 1, textLine.text.length)
		);

		diagnostics.push(new vscode.Diagnostic(
			range,
			message || trimmed,
			vscode.DiagnosticSeverity.Error
		));
	}

	return diagnostics;
}

function sortRegisters(registers: RegisterValue[]): RegisterValue[] {
	const order = [
		'$zero', '$at',
		'$v0', '$v1',
		'$a0', '$a1', '$a2', '$a3',
		'$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
		'$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7',
		'$t8', '$t9',
		'$k0', '$k1',
		'$gp', '$sp', '$fp', '$ra',
		'$pc', '$hi', '$lo'
	];

	const orderMap = new Map(order.map((name, index) => [name, index]));

	return [...registers].sort((a, b) => {
		const aIndex = orderMap.get(a.name) ?? Number.MAX_SAFE_INTEGER;
		const bIndex = orderMap.get(b.name) ?? Number.MAX_SAFE_INTEGER;
		return aIndex - bIndex || a.name.localeCompare(b.name);
	});
}

function sortMemory(memory: MemoryValue[]): MemoryValue[] {
	return [...memory].sort((a, b) => parseInt(a.address, 16) - parseInt(b.address, 16));
}