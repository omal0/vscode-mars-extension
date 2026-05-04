import * as vscode from 'vscode';

export type MemoryValue = {
	address: string;
	value: number;
};

type MemoryDisplayValue = MemoryValue & {
	changed: boolean;
};

class MemoryItem extends vscode.TreeItem {
	constructor(public readonly mem: MemoryDisplayValue) {
		super(mem.address, vscode.TreeItemCollapsibleState.None);

		const hex = `0x${(mem.value >>> 0).toString(16).padStart(8, '0')}`;
		this.description = `${hex} (${mem.value})`;
		this.tooltip = `${mem.address}: ${mem.value}`;

		if (mem.changed) {
			this.label = `${mem.address} *`;
			this.description = `CHANGED  ${hex} (${mem.value})`;  // 👈 step 5 goes here
			this.tooltip = `${mem.address}: ${mem.value} (changed)`;
		}
	}
}

export class MemoryProvider implements vscode.TreeDataProvider<MemoryItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private memory: MemoryDisplayValue[] = [];
	private previousValues = new Map<string, number>();

	getTreeItem(element: MemoryItem): vscode.TreeItem {
		return element;
	}

	getChildren(): MemoryItem[] {
		return this.memory.map((mem) => new MemoryItem(mem));
	}

	setMemory(memory: MemoryValue[]) {
		const nextMemory: MemoryDisplayValue[] = memory.map((mem) => {
			const previousValue = this.previousValues.get(mem.address);
			const changed = previousValue !== undefined && previousValue !== mem.value;

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
}