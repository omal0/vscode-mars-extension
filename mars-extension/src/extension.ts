import * as vscode from 'vscode';
import { spawn } from 'node:child_process';
import * as path from 'node:path';

export function activate(context: vscode.ExtensionContext) {
	const output = vscode.window.createOutputChannel('MARS');

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
	
		const marsJarPath = vscode.Uri.joinPath(
			context.extensionUri,
			'resources',
			'Mars4_5.jar'
		).fsPath;
	
		output.clear();
		output.appendLine(`Running ${filePath}...`);
		output.appendLine(`Jar: ${marsJarPath}`);
		output.appendLine(`File: ${filePath}`);
		output.appendLine('');
		output.show(true);
	
		const child = spawn(javaPath, ['-jar', marsJarPath, 'nc', filePath]);
	
		child.stdout.on('data', (data: Buffer) => {
			output.append(data.toString());
		});
	
		child.stderr.on('data', (data: Buffer) => {
			output.append(data.toString());
		});
	
		child.on('error', (error: Error) => {
			output.appendLine(`\nFailed to start MARS: ${error.message}`);
			vscode.window.showErrorMessage('Failed to start MARS.');
		});
	
		child.on('close', (code: number | null) => {
			output.appendLine(`\nProcess exited with code ${code ?? 'null'}`);
		});
	});

	context.subscriptions.push(helloWorld, runFile, output);
}

export function deactivate() {}