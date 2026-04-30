import * as vscode from 'vscode';

export type MemoryValue = {
	address: string;
	value: number;
};

class MemoryItem extends vscode.TreeItem {
	constructor(public readonly mem: MemoryValue) {
		super(mem.address, vscode.TreeItemCollapsibleState.None);

		this.description = `0x${(mem.value >>> 0).toString(16).padStart(8, '0')} (${mem.value})`;
		this.tooltip = `${mem.address}: ${mem.value}`;
	}
}

export class MemoryProvider implements vscode.TreeDataProvider<MemoryItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private memory: MemoryValue[] = [];

	getTreeItem(element: MemoryItem): vscode.TreeItem {
		return element;
	}

	getChildren(): MemoryItem[] {
		return this.memory.map(m => new MemoryItem(m));
	}

	// 👇 THIS is where setMemory goes
	setMemory(memory: MemoryValue[]) {
		this.memory = memory;
		this._onDidChangeTreeData.fire();
	}

	clear() {
		this.memory = [];
		this._onDidChangeTreeData.fire();
	}
}