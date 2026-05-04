import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { RegistersProvider } from './registers/RegistersProvider';
import type { RegisterValue } from './registers/RegistersProvider';
import { MemoryProvider } from './memory/MemoryProvider';
import type { MemoryValue } from './memory/MemoryProvider';

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
	'.space': 'Reserves a number of bytes.',
	'.asciiz': 'Stores a null-terminated string.',
	'.ascii': 'Stores a string without a null terminator.'
};

const SYSCALL_HELP: Record<string, string> = {
	'1': 'Print integer. Uses `$a0`.',
	'4': 'Print string. Uses `$a0` as string address.',
	'5': 'Read integer. Result goes in `$v0`.',
	'8': 'Read string. Uses `$a0` buffer address and `$a1` length.',
	'10': 'Exit program.',
	'11': 'Print character. Uses `$a0`.'
};

const KNOWN_INSTRUCTIONS = new Set([
	'add', 'addu', 'addi', 'addiu',
	'sub', 'subu',
	'mul', 'div', 'rem',
	'and', 'andi', 'or', 'ori', 'xor', 'nor',
	'sll', 'srl', 'sra',
	'slt', 'slti',
	'lw', 'sw', 'lb', 'sb', 'lh', 'sh',
	'li', 'la', 'move',
	'mfhi', 'mflo',
	'beq', 'bne', 'blt', 'ble', 'bgt', 'bge',
	'j', 'jal', 'jr',
	'syscall', 'nop'
]);

const DIRECTIVES = new Set([
	'.data', '.text', '.globl', '.word', '.byte', '.half',
	'.space', '.asciiz', '.ascii', '.align'
]);

const BRANCH_OR_JUMP_INSTRUCTIONS = new Set([
	'beq', 'bne', 'blt', 'ble', 'bgt', 'bge', 'j', 'jal'
]);

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

// .data segment in default MARS config usually begins at 0x10010000.
// This range asks MARS to display a small window of data memory at end of run.

export function activate(context: vscode.ExtensionContext) {
	const output = vscode.window.createOutputChannel('MARS');
	const registersProvider = new RegistersProvider();
	const memoryProvider = new MemoryProvider();

	vscode.window.registerTreeDataProvider('marsRegistersView', registersProvider);
	vscode.window.registerTreeDataProvider('marsMemoryView', memoryProvider);

	const helloWorld = vscode.commands.registerCommand('mars-extension.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from mars-extension!');
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
			provideCompletionItems(document, position) {
				const completions: vscode.CompletionItem[] = [];
	
				for (const [instruction, help] of Object.entries(INSTRUCTION_HELP)) {
					const item = new vscode.CompletionItem(
						instruction,
						vscode.CompletionItemKind.Function
					);
	
					item.detail = 'MIPS instruction';
					item.documentation = new vscode.MarkdownString(help);
					item.insertText = instruction;
	
					completions.push(item);
				}
	
				for (const [register, help] of Object.entries(REGISTER_HELP)) {
					const item = new vscode.CompletionItem(
						register,
						vscode.CompletionItemKind.Variable
					);
	
					item.detail = 'MIPS register';
					item.documentation = new vscode.MarkdownString(help);
					item.insertText = register;
	
					completions.push(item);
				}
	
				for (const [directive, help] of Object.entries(DIRECTIVE_HELP)) {
					const item = new vscode.CompletionItem(
						directive,
						vscode.CompletionItemKind.Keyword
					);
	
					item.detail = 'MIPS directive';
					item.documentation = new vscode.MarkdownString(help);
					item.insertText = directive;
	
					completions.push(item);
				}
	
				for (const [code, help] of Object.entries(SYSCALL_HELP)) {
					const item = new vscode.CompletionItem(
						`syscall ${code}`,
						vscode.CompletionItemKind.Value
					);
	
					item.detail = `Syscall ${code}`;
					item.documentation = new vscode.MarkdownString(help);
					item.insertText = code;
	
					completions.push(item);
				}
				
				const labels = collectLabels(document);

				for (const label of labels) {
					const item = new vscode.CompletionItem(
						label,
						vscode.CompletionItemKind.Reference
					);

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
	
	context.subscriptions.push(completionProvider);
	
	context.subscriptions.push(hoverProvider);
	
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('mars');

	const marsDiagnostics = vscode.languages.createDiagnosticCollection('mars');
	context.subscriptions.push(marsDiagnostics);

	function refreshStaticDiagnostics(document: vscode.TextDocument) {
		if (document.languageId !== 'mips') {
			marsDiagnostics.delete(document.uri);
			return;
		}

		const diagnostics = collectStaticDiagnostics(document);
		marsDiagnostics.set(document.uri, diagnostics);
	}

	if (vscode.window.activeTextEditor) {
		refreshStaticDiagnostics(vscode.window.activeTextEditor.document);
	}

	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(refreshStaticDiagnostics),
		vscode.workspace.onDidChangeTextDocument((event) => {
			refreshStaticDiagnostics(event.document);
		}),
		vscode.workspace.onDidCloseTextDocument((document) => {
			marsDiagnostics.delete(document.uri);
		})
	);
	
	function refreshDiagnostics(document: vscode.TextDocument) {
		if (document.languageId !== 'mips') {
			diagnosticCollection.delete(document.uri);
			return;
		}

		const diagnostics: vscode.Diagnostic[] = [];

		for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
			const line = document.lineAt(lineIndex);
			const textWithoutComment = line.text.split('#')[0].trim();

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
				const range = new vscode.Range(
					lineIndex,
					start,
					lineIndex,
					start + firstToken.length
				);

				diagnostics.push(
					new vscode.Diagnostic(
						range,
						`Unknown MIPS instruction or directive: ${firstToken}`,
						vscode.DiagnosticSeverity.Error
					)
				);
			}
		}

		diagnosticCollection.set(document.uri, diagnostics);
	}

if (vscode.window.activeTextEditor) {
	refreshDiagnostics(vscode.window.activeTextEditor.document);
}

context.subscriptions.push(
	diagnosticCollection,
	vscode.workspace.onDidOpenTextDocument(refreshDiagnostics),
	vscode.workspace.onDidChangeTextDocument((event) => {
		refreshDiagnostics(event.document);
	}),
	vscode.workspace.onDidCloseTextDocument((document) => {
		diagnosticCollection.delete(document.uri);
	})
);

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
	
	context.subscriptions.push(debugConfigProvider);

	const runFile = vscode.commands.registerCommand('mars-extension.runFile', async () => {
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

		marsDiagnostics.delete(document.uri);

		if (!filePath.endsWith('.asm')) {
			vscode.window.showErrorMessage('Please open a .asm file.');
			return;
		}

		await document.save();

		const config = vscode.workspace.getConfiguration('mars-extension');
		const memoryStart = config.get<string>('memoryStartAddress', '0x10010000');
		const memoryEnd = config.get<string>('memoryEndAddress', '0x10010040');
		const memoryRange = `${memoryStart}-${memoryEnd}`;
		const javaPath = config.get<string>('javaPath', 'java');
		const configuredJarPath = config.get<string>('marsJarPath', '').trim();

		const bundledJarPath = vscode.Uri.joinPath(
			context.extensionUri,
			'resources',
			'Mars4_5.jar'
		).fsPath;

		const marsJarPath = configuredJarPath || bundledJarPath;

		output.clear();
		output.appendLine(`Running ${filePath}...`);
		output.appendLine(`Java: ${javaPath}`);
		output.appendLine(`Jar: ${marsJarPath}`);
		output.appendLine(`File: ${filePath}`);
		output.appendLine('');
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
			...memoryRange,
			filePath
		];

		output.appendLine(`Args: ${args.join(' ')}`);
		output.appendLine('');

		const child = spawn(javaPath, args);

		let programOutput = '';
		let marsOutput = '';

		child.stdout.on('data', (data: Buffer) => {
			const text = data.toString();
			programOutput += text;
			output.append(text);
		});

		child.stderr.on('data', (data: Buffer) => {
			marsOutput += data.toString();
		});

		child.on('error', (error: Error) => {
			output.appendLine(`\nFailed to start MARS: ${error.message}`);
			vscode.window.showErrorMessage(`Failed to start MARS: ${error.message}`);
		});

		child.on('close', (code: number | null) => {
			output.appendLine(`\nProcess exited with code ${code ?? 'null'}`);
			
			const errors = parseMarsErrors(marsOutput, document);

			const staticDiagnostics = collectStaticDiagnostics(document);
			const marsErrors = parseMarsErrors(marsOutput, document);

			const displayFormat = config.get<'hex' | 'dec' | 'both'>('displayFormat', 'both');

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
				vscode.window.showErrorMessage(`MARS found ${errors.length} error(s).`);
			} else {
				marsDiagnostics.delete(document.uri);
			}

			if (registers.length > 0) {
				registersProvider.setRegisters(registers);
				// output.appendLine(`Parsed ${registers.length} register value(s).`);
			} else {
				output.appendLine('No register values were parsed from MARS messages.');
			}

			if (memory.length > 0) {
				memoryProvider.setMemory(memory);
				// output.appendLine(`Parsed ${memory.length} memory word(s).`);
			} else {
				output.appendLine('No memory values were parsed from MARS messages.');
			}

			if (registers.length === 0 && memory.length === 0) {
				output.appendLine('');
				// output.appendLine('----- Raw MARS stderr -----');
				// output.appendLine(marsOutput || '(empty)');

				vscode.window.showWarningMessage(
					'MARS ran, but the register/memory dump format did not match the parser yet.'
				);
			}
		});
	});

	const debugAdapterFactory = vscode.debug.registerDebugAdapterDescriptorFactory('mars', {
		createDebugAdapterDescriptor() {
			return new vscode.DebugAdapterExecutable('node', [
				context.asAbsolutePath('dist/debugAdapter.js')
			]);
		}
	});
	
	context.subscriptions.push(debugAdapterFactory);

	context.subscriptions.push(helloWorld, runFile, output, debugAdapterFactory);
}

export function deactivate() {}

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
			const labelRange = new vscode.Range(
				lineIndex,
				labelStart,
				lineIndex,
				labelStart + label.length
			);

			if (labels.has(label)) {
				diagnostics.push(
					new vscode.Diagnostic(
						labelRange,
						`Duplicate label: ${label}`,
						vscode.DiagnosticSeverity.Error
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
			const range = new vscode.Range(
				lineIndex,
				start,
				lineIndex,
				start + firstToken.length
			);

			diagnostics.push(
				new vscode.Diagnostic(
					range,
					`Unknown MIPS instruction or directive: ${firstToken}`,
					vscode.DiagnosticSeverity.Error
				)
			);

			continue;
		}

		if (BRANCH_OR_JUMP_INSTRUCTIONS.has(firstToken)) {
			const possibleLabel = getPossibleBranchLabel(firstToken, working);

			if (possibleLabel) {
				const labelStart = line.text.indexOf(possibleLabel);
				const range = new vscode.Range(
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
				new vscode.Diagnostic(
					use.range,
					`Undefined label: ${use.label}`,
					vscode.DiagnosticSeverity.Error
				)
			);
		}
	}

	return diagnostics;
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

function getPossibleBranchLabel(instruction: string, line: string): string | undefined {
	const withoutInstruction = line.slice(instruction.length).trim();
	const parts = withoutInstruction
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);

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

		// Match an address anywhere in the line.
		const addressMatch = trimmed.match(/0x[0-9a-fA-F]{8}/);
		if (!addressMatch) {
			continue;
		}

		const address = addressMatch[0];

		// Find all hex words in the line.
		const hexWords = trimmed.match(/0x[0-9a-fA-F]{1,8}/g) ?? [];

		// Skip the first one if it is the address, use the next as the value.
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

		// Common MARS format examples:
		// Error in /path/file.asm line 12 column 5: ...
		// Error in line 12 column 5: ...
		// line 12: ...
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
		const endChar = Math.min(startChar + 1, textLine.text.length);

		const range = new vscode.Range(
			zeroBasedLine,
			startChar,
			zeroBasedLine,
			endChar
		);

		diagnostics.push(
			new vscode.Diagnostic(
				range,
				message || trimmed,
				vscode.DiagnosticSeverity.Error
			)
		);
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