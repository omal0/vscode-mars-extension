import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { RegistersProvider } from './registers/RegistersProvider';
import type { RegisterValue } from './registers/RegistersProvider';
import { MemoryProvider } from './memory/MemoryProvider';
import type { MemoryValue } from './memory/MemoryProvider';

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
const MEMORY_RANGES_TO_READ = [
	'0x10010000-0x10010040'
];

export function activate(context: vscode.ExtensionContext) {
	const output = vscode.window.createOutputChannel('MARS');
	const registersProvider = new RegistersProvider();
	const memoryProvider = new MemoryProvider();

	vscode.window.registerTreeDataProvider('marsRegistersView', registersProvider);
	vscode.window.registerTreeDataProvider('marsMemoryView', memoryProvider);

	const helloWorld = vscode.commands.registerCommand('mars-extension.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from mars-extension!');
	});

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

		if (!filePath.endsWith('.asm')) {
			vscode.window.showErrorMessage('Please open a .asm file.');
			return;
		}

		await document.save();

		const config = vscode.workspace.getConfiguration('mars-extension');
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
			...MEMORY_RANGES_TO_READ,
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
			const text = data.toString();
			marsOutput += text;
			// output.append(text);
		});

		child.on('error', (error: Error) => {
			output.appendLine(`\nFailed to start MARS: ${error.message}`);
			vscode.window.showErrorMessage(`Failed to start MARS: ${error.message}`);
		});

		child.on('close', (code: number | null) => {
			output.appendLine(`\nProcess exited with code ${code ?? 'null'}`);

			const registers = parseMarsRegisters(marsOutput);
			const memory = parseMarsMemory(marsOutput);

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

	context.subscriptions.push(helloWorld, runFile, output);
}

export function deactivate() {}

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

		// Common likely formats:
		// 0x10010000    0x00000005
		// 0x10010000: 0x00000005
		// 0x10010000    5
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

		const value =
			rawValue.startsWith('0x') || rawValue.startsWith('0X')
				? parseInt(rawValue, 16)
				: Number(rawValue);

		memory.push({
			address,
			value
		});
		seen.add(address);
	}

	return sortMemory(memory);
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