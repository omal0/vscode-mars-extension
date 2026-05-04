import * as vscode from 'vscode';

export type DisplayFormat = 'hex' | 'dec' | 'both';

export type RegisterValue = {
	name: string;
	value: number;
	displayFormat?: DisplayFormat;
};

type RegisterDisplayValue = RegisterValue & {
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

class RegisterItem extends vscode.TreeItem {
	constructor(public readonly reg: RegisterDisplayValue) {
		super(reg.name, vscode.TreeItemCollapsibleState.None);

		const formattedValue = formatValue(reg.value, reg.displayFormat);

		this.description = formattedValue;
		this.tooltip = `${reg.name}: ${formattedValue}`;

		if (reg.changed) {
			this.label = `${reg.name} *`;
			this.description = `CHANGED  ${formattedValue}`;
			this.tooltip = `${reg.name}: ${formattedValue} (changed)`;
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