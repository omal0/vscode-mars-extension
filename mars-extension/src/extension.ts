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
			vscode.window.showErrorMessage('No active file.');
			return;
		}

		const document = editor.document;

		if (document.isUntitled) {
			vscode.window.showErrorMessage('Please save the file first.');
			return;
		}

		await document.save();

		const config = vscode.workspace.getConfiguration('mars-extension');
		const marsJarPath = config.get<string>('marsJarPath', '');
		const javaPath = config.get<string>('javaPath', 'java');

		if (!marsJarPath) {
			vscode.window.showErrorMessage('Set mars-extension.marsJarPath in Settings first.');
			return;
		}

		const filePath = document.uri.fsPath;
		const fileDir = path.dirname(filePath);

		output.clear();
		output.show(true);
		output.appendLine(`Running ${path.basename(filePath)}...`);
		output.appendLine(`Command: ${javaPath} -jar ${marsJarPath} nc ${filePath}`);
		output.appendLine('');

		const child = spawn(
			javaPath,
			['-jar', marsJarPath, 'nc', filePath],
			{ cwd: fileDir }
		);

		child.stdout.on('data', (data: Buffer) => {
			output.append(data.toString());
		});

		child.stderr.on('data', (data: Buffer) => {
			output.append(data.toString());
		});

		child.on('error', (error: Error) => {
			output.appendLine('');
			output.appendLine(`Failed to start MARS: ${error.message}`);
			vscode.window.showErrorMessage('Failed to start MARS. Check your Java path and MARS jar path.');
		});

		child.on('close', (code: number | null) => {
			output.appendLine('');
			output.appendLine(`Process exited with code ${code ?? 'null'}`);

			if (code === 0) {
				vscode.window.showInformationMessage('MARS run finished successfully.');
			} else {
				vscode.window.showErrorMessage(`MARS exited with code ${code ?? 'unknown'}.`);
			}
		});
	});

	context.subscriptions.push(helloWorld, runFile, output);
}

export function deactivate() {}