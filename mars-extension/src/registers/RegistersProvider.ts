import * as vscode from 'vscode';

export type RegisterValue = {
	name: string;
	value: number;
};

type RegisterDisplayValue = RegisterValue & {
	changed: boolean;
};

class RegisterItem extends vscode.TreeItem {
	constructor(public readonly reg: RegisterDisplayValue) {
		super(reg.name, vscode.TreeItemCollapsibleState.None);

		const hex = `0x${(reg.value >>> 0).toString(16).padStart(8, '0')}`;
		this.description = `${hex} (${reg.value})`;
		this.tooltip = `${reg.name}: ${reg.value}`;

		if (reg.changed) {
			this.label = `${reg.name} *`;
			this.description = `CHANGED  ${hex} (${reg.value})`;  // 👈 step 5 goes here
			this.tooltip = `${reg.name}: ${reg.value} (changed)`;
		}
	}
}

export class RegistersProvider implements vscode.TreeDataProvider<RegisterItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private registers: RegisterDisplayValue[] = [];
	private previousValues = new Map<string, number>();

	getTreeItem(element: RegisterItem): vscode.TreeItem {
		return element;
	}

	getChildren(): RegisterItem[] {
		return this.registers.map((reg) => new RegisterItem(reg));
	}

	setRegisters(registers: RegisterValue[]) {
		const nextRegisters: RegisterDisplayValue[] = registers.map((reg) => {
			const previousValue = this.previousValues.get(reg.name);
			const changed = previousValue !== undefined && previousValue !== reg.value;

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
}