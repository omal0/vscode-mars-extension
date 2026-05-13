# MARS Extension (MIPS for VS Code)

Run, inspect, and learn MIPS assembly directly inside VS Code using the MARS simulator.

---

## Features

### Run MIPS Programs
- Run `.asm` / `.s` files with one click
- Uses MARS under the hood
- Optional stdin input support

### Register Viewer
- View CPU registers in Explorer
- See values in:
  - Hex
  - Decimal
  - Both
- Highlights changed registers between runs
- Optional detailed webview panel

### Memory Viewer
- Inspect memory ranges
- Configurable start/end addresses
- Change highlighting

### Syntax Support
- Syntax highlighting for MIPS
- Instruction, register, directive coloring

### IntelliSense
- Auto-complete:
  - Instructions
  - Registers
  - Directives
  - Labels
- Snippets for common instructions

### Hover Info
- Hover instructions → explanation
- Hover registers → description
- Hover syscalls → behavior

### Diagnostics
- Unknown instructions
- Duplicate labels
- Undefined labels
- Parsed MARS errors

---

## Getting Started

1. Install the extension
2. Open a `.asm` or `.s` file
3. Click ▶ **Run MARS**
4. View:
   - Output panel
   - Registers panel
   - Memory panel

---

## Configuration

Open VS Code settings and configure:

```json
"mars-extension.javaPath": "java",
"mars-extension.marsJarPath": "",
"mars-extension.displayFormat": "both",
"mars-extension.memoryStartAddress": "0x10010000",
"mars-extension.memoryEndAddress": "0x10010040"