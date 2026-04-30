export type RegisterValue = {
    name: string;
    value: number;
    hex?: string;
    changed?: boolean;
  };
  
  export type MemoryCell = {
    address: number;
    value: number;
  };
  
  export type Instruction = {
    address: number;
    text: string;
  };