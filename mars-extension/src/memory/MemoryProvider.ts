import * as vscode from 'vscode';

export type DisplayFormat = 'hex' | 'dec' | 'both';

export type MemoryValue = {
	address: string;
	value: number;
	displayFormat?: DisplayFormat;
};

type MemoryDisplayValue = MemoryValue & {
	changed: boolean;
};

function formatValue(value: number, displayFormat: DisplayFormat = 'both'): string {
	const hex = `0x${(value >>> 0).toString(16).padStart(8, '0')}`;

	if (displayFormat === 'hex') {
		return hex;
	}

	if (displayFormat === 'dec') {
		return `${value}`;
	}

	return `${hex} (${value})`;
}

class MemoryItem extends vscode.TreeItem {
	constructor(public readonly mem: MemoryDisplayValue) {
		super(mem.address, vscode.TreeItemCollapsibleState.None);

		const formattedValue = formatValue(mem.value, mem.displayFormat);

		this.description = formattedValue;
		this.tooltip = `${mem.address}: ${formattedValue}`;

		if (mem.changed) {
			this.label = `${mem.address} *`;
			this.description = `CHANGED  ${formattedValue}`;
			this.tooltip = `${mem.address}: ${formattedValue} (changed)`;
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