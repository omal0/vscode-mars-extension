export type RegisterValue = {
	name: string;
	value: number;
	displayFormat?: 'hex' | 'dec' | 'both';
};
  
export type MemoryValue = {
	address: string;
	value: number;
	displayFormat?: 'hex' | 'dec' | 'both';
};

  export type MemoryCell = {
    address: number;
    value: number;
  };
  
  export type Instruction = {
    address: number;
    text: string;
  };