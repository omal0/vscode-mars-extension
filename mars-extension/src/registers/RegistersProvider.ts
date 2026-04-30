import * as vscode from 'vscode';

export type RegisterValue = {
	name: string;
	value: number;
};

class RegisterItem extends vscode.TreeItem {
	constructor(public readonly reg: RegisterValue) {
		super(reg.name, vscode.TreeItemCollapsibleState.None);
		this.description = `0x${(reg.value >>> 0).toString(16).padStart(8, '0')} (${reg.value})`;
		this.tooltip = `${reg.name}: ${reg.value}`;
	}
}

export class RegistersProvider implements vscode.TreeDataProvider<RegisterItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private registers: RegisterValue[] = [];

	getTreeItem(element: RegisterItem): vscode.TreeItem {
		return element;
	}

	getChildren(): RegisterItem[] {
		return this.registers.map((reg) => new RegisterItem(reg));
	}

	setRegisters(registers: RegisterValue[]) {
		this.registers = registers;
		this._onDidChangeTreeData.fire();
	}

	clear() {
		this.registers = [];
		this._onDidChangeTreeData.fire();
	}
}