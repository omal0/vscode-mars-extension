"use strict";var G=Object.create;var C=Object.defineProperty;var q=Object.getOwnPropertyDescriptor;var K=Object.getOwnPropertyNames;var X=Object.getPrototypeOf,Y=Object.prototype.hasOwnProperty;var Q=(r,t)=>{for(var s in t)C(r,s,{get:t[s],enumerable:!0})},H=(r,t,s,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of K(t))!Y.call(r,o)&&o!==s&&C(r,o,{get:()=>t[o],enumerable:!(n=q(t,o))||n.enumerable});return r};var M=(r,t,s)=>(s=r!=null?G(X(r)):{},H(t||!r||!r.__esModule?C(s,"default",{value:r,enumerable:!0}):s,r)),ee=r=>H(C({},"__esModule",{value:!0}),r);var be={};Q(be,{activate:()=>ie,deactivate:()=>de});module.exports=ee(be);var e=M(require("vscode")),z=require("child_process"),B=M(require("path")),U=M(require("fs"));var x=M(require("vscode"));function te(r,t="both"){let s=`0x${(r>>>0).toString(16).padStart(8,"0")}`;return t==="hex"?s:t==="dec"?`${r}`:`${s} (${r})`}var _=class extends x.TreeItem{constructor(s){super(s.name,x.TreeItemCollapsibleState.None);this.reg=s;let n=te(s.value,s.displayFormat);this.description=n,this.tooltip=`${s.name}: ${n}`,s.changed&&(this.label=`${s.name} *`,this.description=`CHANGED  ${n}`,this.tooltip=`${s.name}: ${n} (changed)`)}},I=class{constructor(){this._onDidChangeTreeData=new x.EventEmitter;this.onDidChangeTreeData=this._onDidChangeTreeData.event;this.registers=[];this.previousValues=new Map}getTreeItem(t){return t}getChildren(){return this.registers.map(t=>new _(t))}setRegisters(t){let s=t.map(n=>{let o=this.previousValues.get(n.name),m=o!==void 0&&o!==n.value;return{...n,changed:m}});this.registers=s,this.previousValues.clear();for(let n of t)this.previousValues.set(n.name,n.value);this._onDidChangeTreeData.fire()}clear(){this.registers=[],this._onDidChangeTreeData.fire()}};var D=M(require("vscode"));function se(r,t="both"){let s=`0x${(r>>>0).toString(16).padStart(8,"0")}`;return t==="hex"?s:t==="dec"?`${r}`:`${s} (${r})`}var F=class extends D.TreeItem{constructor(s){super(s.address,D.TreeItemCollapsibleState.None);this.mem=s;let n=se(s.value,s.displayFormat);this.description=n,this.tooltip=`${s.address}: ${n}`,s.changed&&(this.label=`${s.address} *`,this.description=`CHANGED  ${n}`,this.tooltip=`${s.address}: ${n} (changed)`)}},E=class{constructor(){this._onDidChangeTreeData=new D.EventEmitter;this.onDidChangeTreeData=this._onDidChangeTreeData.event;this.memory=[];this.previousValues=new Map}getTreeItem(t){return t}getChildren(){return this.memory.map(t=>new F(t))}setMemory(t){let s=t.map(n=>{let o=this.previousValues.get(n.address),m=o!==void 0&&o!==n.value;return{...n,changed:m}});this.memory=s,this.previousValues.clear();for(let n of t)this.previousValues.set(n.address,n.value);this._onDidChangeTreeData.fire()}clear(){this.memory=[],this._onDidChangeTreeData.fire()}};var y,re=["zero","at","v0","v1","a0","a1","a2","a3","t0","t1","t2","t3","t4","t5","t6","t7","s0","s1","s2","s3","s4","s5","s6","s7","t8","t9","k0","k1","gp","sp","fp","ra"],A={add:"`add $d, $s, $t`\n\nAdds two registers: `$d = $s + $t`.",addi:"`addi $t, $s, imm`\n\nAdds an immediate value: `$t = $s + imm`.",sub:"`sub $d, $s, $t`\n\nSubtracts registers: `$d = $s - $t`.",mul:"`mul $d, $s, $t`\n\nMultiplies registers: `$d = $s * $t`.",div:"`div $s, $t`\n\nDivides `$s / $t`. Quotient goes to `LO`, remainder goes to `HI`.",rem:"`rem $d, $s, $t`\n\nStores remainder: `$d = $s % $t`.",li:"`li $t, imm`\n\nLoads an immediate value into a register.",la:"`la $t, label`\n\nLoads the address of a label into a register.",move:"`move $d, $s`\n\nCopies one register into another.",lw:"`lw $t, offset($s)`\n\nLoads a word from memory.",sw:"`sw $t, offset($s)`\n\nStores a word into memory.",beq:"`beq $s, $t, label`\n\nBranches if `$s == $t`.",bne:"`bne $s, $t, label`\n\nBranches if `$s != $t`.",j:"`j label`\n\nJumps to a label.",jal:"`jal label`\n\nJumps to a label and saves return address in `$ra`.",jr:"`jr $ra`\n\nJumps to the address stored in a register.",syscall:"`syscall`\n\nRuns the system call selected by `$v0`.",nop:"`nop`\n\nNo operation."},N={$zero:"Always contains `0`.",$at:"Assembler temporary register.",$v0:"Return value register / syscall code.",$v1:"Return value register.",$a0:"Argument register 0.",$a1:"Argument register 1.",$a2:"Argument register 2.",$a3:"Argument register 3.",$t0:"Temporary register.",$t1:"Temporary register.",$t2:"Temporary register.",$t3:"Temporary register.",$t4:"Temporary register.",$t5:"Temporary register.",$t6:"Temporary register.",$t7:"Temporary register.",$s0:"Saved register.",$s1:"Saved register.",$s2:"Saved register.",$s3:"Saved register.",$s4:"Saved register.",$s5:"Saved register.",$s6:"Saved register.",$s7:"Saved register.",$t8:"Temporary register.",$t9:"Temporary register.",$gp:"Global pointer.",$sp:"Stack pointer.",$fp:"Frame pointer.",$ra:"Return address."},P={".data":"Starts the data segment.",".text":"Starts the code/text segment.",".globl":"Marks a label as globally visible.",".word":"Stores one or more 32-bit values.",".byte":"Stores one or more bytes.",".half":"Stores one or more 16-bit values.",".space":"Reserves a number of bytes.",".asciiz":"Stores a null-terminated string.",".ascii":"Stores a string without a null terminator.",".align":"Aligns the next data item."},j={1:"Print integer. Uses `$a0`.",4:"Print string. Uses `$a0` as string address.",5:"Read integer. Result goes in `$v0`.",8:"Read string. Uses `$a0` buffer address and `$a1` length.",10:"Exit program.",11:"Print character. Uses `$a0`."},ne=new Set(Object.keys(A).concat(["addu","addiu","subu","and","andi","or","ori","xor","nor","sll","srl","sra","slt","slti","lb","sb","lh","sh","mfhi","mflo","blt","ble","bgt","bge"])),oe=new Set(Object.keys(P)),ae=new Set(["beq","bne","blt","ble","bgt","bge","j","jal"]);function ie(r){let t=e.window.createOutputChannel("MARS"),s=new I,n=new E,o=e.languages.createDiagnosticCollection("mars");e.window.registerTreeDataProvider("marsRegistersView",s),e.window.registerTreeDataProvider("marsMemoryView",n);let m=e.commands.registerCommand("mars-extension.helloWorld",()=>{e.window.showInformationMessage("Hello World from mars-extension!")}),l=e.commands.registerCommand("mars-extension.showRegisters",()=>{ce()}),a=e.commands.registerCommand("mars-extension.runFile",async()=>{await O(r,t,s,n,o)}),h=e.commands.registerCommand("mars-extension.runWithInput",async()=>{let g=await e.window.showInputBox({prompt:"Enter stdin input for your MIPS program",placeHolder:"e.g. 42 or 5 10 15"});g!==void 0&&await O(r,t,s,n,o,g+`
`)}),p=e.languages.registerHoverProvider("mips",{provideHover(g,v){let d=g.getWordRangeAtPosition(v,/[\.$]?[A-Za-z_][A-Za-z0-9_]*|[0-9]+/);if(!d)return;let c=g.getText(d);if(A[c])return new e.Hover(new e.MarkdownString(A[c]),d);if(N[c])return new e.Hover(new e.MarkdownString(N[c]),d);if(P[c])return new e.Hover(new e.MarkdownString(P[c]),d);let b=g.lineAt(v.line).text.match(/li\s+\$v0,\s*(\d+)/);if(b&&b[1]===c&&j[c])return new e.Hover(new e.MarkdownString(`**Syscall ${c}**

${j[c]}`),d)}}),i=e.languages.registerCompletionItemProvider("mips",{provideCompletionItems(g){let v=[];for(let[d,c]of Object.entries(A)){let u=new e.CompletionItem(d,e.CompletionItemKind.Function);u.detail="MIPS instruction",u.documentation=new e.MarkdownString(c),u.insertText=me(d),v.push(u)}for(let[d,c]of Object.entries(N)){let u=new e.CompletionItem(d,e.CompletionItemKind.Variable);u.detail="MIPS register",u.documentation=new e.MarkdownString(c),u.insertText=d,v.push(u)}for(let[d,c]of Object.entries(P)){let u=new e.CompletionItem(d,e.CompletionItemKind.Keyword);u.detail="MIPS directive",u.documentation=new e.MarkdownString(c),u.insertText=d,v.push(u)}for(let[d,c]of Object.entries(j)){let u=new e.CompletionItem(`syscall ${d}`,e.CompletionItemKind.Value);u.detail=`Syscall ${d}`,u.documentation=new e.MarkdownString(c),u.insertText=d,v.push(u)}for(let d of ge(g)){let c=new e.CompletionItem(d,e.CompletionItemKind.Reference);c.detail="MIPS label",c.insertText=d,v.push(c)}return v}},"$",".");function $(g){if(g.languageId!=="mips"){o.delete(g.uri);return}o.set(g.uri,W(g))}e.window.activeTextEditor&&$(e.window.activeTextEditor.document);let f=e.debug.registerDebugConfigurationProvider("mars",{resolveDebugConfiguration(g,v){if(v.type||(v.type="mars"),v.name||(v.name="Debug MIPS with MARS"),v.request||(v.request="launch"),!v.program){let d=e.window.activeTextEditor;d&&(v.program=d.document.uri.fsPath)}return v}}),S=e.debug.registerDebugAdapterDescriptorFactory("mars",{createDebugAdapterDescriptor(){return new e.DebugAdapterExecutable("node",[r.asAbsolutePath("dist/debugAdapter.js")])}});r.subscriptions.push(m,l,a,h,t,o,p,i,f,S,e.workspace.onDidOpenTextDocument($),e.workspace.onDidChangeTextDocument(g=>$(g.document)),e.workspace.onDidCloseTextDocument(g=>o.delete(g.uri)))}function de(){}async function O(r,t,s,n,o,m){let l=e.window.activeTextEditor;if(!l){e.window.showErrorMessage("No active editor.");return}let a=l.document;if(a.uri.scheme!=="file"){e.window.showErrorMessage("Please switch to a saved .asm file before running.");return}if(a.isUntitled){e.window.showErrorMessage("Please save the file first.");return}let h=a.uri.fsPath;if(!h.endsWith(".asm")&&!h.endsWith(".s")){e.window.showErrorMessage("Please open a .asm or .s file.");return}await a.save();let p=e.workspace.getConfiguration("mars-extension"),i=p.get("javaPath","java"),$=p.get("marsJarPath","").trim(),f=p.get("displayFormat","both"),S=p.get("memoryStartAddress","0x10010000"),g=p.get("memoryEndAddress","0x10010040"),v=`${S}-${g}`,d=e.Uri.joinPath(r.extensionUri,"resources","Mars4_5.jar").fsPath,c=$||d;if(!U.existsSync(c)){e.window.showErrorMessage(`Mars4_5.jar not found at: ${c}`);return}o.delete(a.uri),t.clear(),t.appendLine(`\u25B6 Running: ${B.basename(h)}`),t.appendLine(`JAR : ${c}`),t.appendLine(`Java: ${i}`),t.appendLine("\u2500".repeat(50)),t.show(!0),s.clear(),n.clear();let u=["-jar",c,"nc","hex","me",...re,v,h],b=(0,z.spawn)(i,u);m!==void 0&&(b.stdin.write(m),b.stdin.end());let R="";b.stdout.on("data",w=>{t.append(w.toString())}),b.stderr.on("data",w=>{R+=w.toString()}),b.on("error",w=>{t.appendLine(`
Failed to start MARS: ${w.message}`),e.window.showErrorMessage(`Failed to start MARS: ${w.message}`)}),b.on("close",w=>{t.appendLine("\u2500".repeat(50)),t.appendLine(`Process exited with code ${w??"null"}`);let J=W(a),V=he(R,a),Z=[...J,...V];o.set(a.uri,Z),V.length>0&&e.window.showErrorMessage(`MARS found ${V.length} error(s).`);let T=pe(R).map(L=>({...L,displayFormat:f})),k=ve(R).map(L=>({...L,displayFormat:f}));T.length>0?(s.setRegisters(T),y&&y.webview.postMessage({type:"registers",data:T})):t.appendLine("No register values were parsed from MARS messages."),k.length>0?n.setMemory(k):t.appendLine("No memory values were parsed from MARS messages."),T.length===0&&k.length===0&&e.window.showWarningMessage("MARS ran, but the register/memory dump format did not match the parser.")})}function ce(){if(y){y.reveal(e.ViewColumn.Two);return}y=e.window.createWebviewPanel("marsRegisters","MARS Register State",e.ViewColumn.Two,{enableScripts:!0}),y.webview.html=le(),y.onDidDispose(()=>{y=void 0})}function le(){return`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
	body {
		font-family: var(--vscode-editor-font-family);
		background: var(--vscode-editor-background);
		color: var(--vscode-editor-foreground);
		padding: 12px;
	}
	h2 {
		color: var(--vscode-textLink-foreground);
		margin-bottom: 12px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}
	th {
		background: var(--vscode-editorGroupHeader-tabsBackground);
		color: var(--vscode-symbolIcon-variableForeground);
		padding: 6px 10px;
		text-align: left;
		border-bottom: 1px solid var(--vscode-panel-border);
	}
	td {
		padding: 5px 10px;
		border-bottom: 1px solid var(--vscode-panel-border);
	}
	tr:hover td {
		background: var(--vscode-list-hoverBackground);
	}
	.val {
		color: var(--vscode-debugTokenExpression-number);
	}
	.changed td {
		background: rgba(255, 204, 0, 0.12);
	}
	#placeholder {
		color: var(--vscode-descriptionForeground);
		margin-top: 20px;
	}
</style>
</head>
<body>
	<h2>\u2699 MARS Register State</h2>

	<p id="placeholder">Run a .asm file to see register values here.</p>

	<table id="regTable" style="display:none">
		<thead>
			<tr>
				<th>Register</th>
				<th>Value (dec)</th>
				<th>Value (hex)</th>
			</tr>
		</thead>
		<tbody id="regBody"></tbody>
	</table>

	<script>
		window.addEventListener('message', event => {
			const msg = event.data;

			if (msg.type !== 'registers') {
				return;
			}

			const tbody = document.getElementById('regBody');
			const table = document.getElementById('regTable');
			const placeholder = document.getElementById('placeholder');

			tbody.innerHTML = '';

			msg.data.forEach(r => {
				const hex = '0x' + (r.value >>> 0).toString(16).padStart(8, '0');
				const changedClass = r.changed ? 'changed' : '';

				tbody.innerHTML += \`
					<tr class="\${changedClass}">
						<td>\${r.name}</td>
						<td class="val">\${r.value}</td>
						<td class="val">\${hex}</td>
					</tr>
				\`;
			});

			table.style.display = 'table';
			placeholder.style.display = 'none';
		});
	</script>
</body>
</html>`}function me(r){switch(r){case"addi":return new e.SnippetString("addi ${1:$t0}, ${2:$t0}, ${3:1}");case"lw":return new e.SnippetString("lw ${1:$t0}, ${2:0}(${3:$sp})");case"sw":return new e.SnippetString("sw ${1:$t0}, ${2:0}(${3:$sp})");case"beq":return new e.SnippetString("beq ${1:$t0}, ${2:$t1}, ${3:label}");case"bne":return new e.SnippetString("bne ${1:$t0}, ${2:$t1}, ${3:label}");case"li":return new e.SnippetString("li ${1:$v0}, ${2:1}");case"la":return new e.SnippetString("la ${1:$a0}, ${2:label}");default:return r}}function ge(r){let t=[];for(let s=0;s<r.lineCount;s++){let o=r.lineAt(s).text.split("#")[0].match(/^\s*([A-Za-z_][A-Za-z0-9_]*):/);o&&t.push(o[1])}return t}function W(r){let t=[],s=new Map,n=[];for(let o=0;o<r.lineCount;o++){let m=r.lineAt(o),a=m.text.split("#")[0].trim();if(!a)continue;let h=a.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);if(h){let i=h[1],$=m.text.indexOf(i),f=new e.Range(o,$,o,$+i.length);if(s.has(i)?t.push(new e.Diagnostic(f,`Duplicate label: ${i}`,e.DiagnosticSeverity.Error)):s.set(i,f),a=h[2].trim(),!a)continue}let p=a.split(/\s+/)[0];if(!oe.has(p)){if(!ne.has(p)){let i=m.text.indexOf(p),$=new e.Range(o,i,o,i+p.length);t.push(new e.Diagnostic($,`Unknown MIPS instruction or directive: ${p}`,e.DiagnosticSeverity.Error));continue}if(ae.has(p)){let i=ue(p,a);if(i){let $=m.text.indexOf(i),f=new e.Range(o,$,o,$+i.length);n.push({label:i,range:f})}}}}for(let o of n)s.has(o.label)||t.push(new e.Diagnostic(o.range,`Undefined label: ${o.label}`,e.DiagnosticSeverity.Error));return t}function ue(r,t){let n=t.slice(r.length).trim().split(",").map(o=>o.trim()).filter(Boolean);if(n.length!==0)return r==="j"||r==="jal"?n[0]:n[n.length-1]}function pe(r){let t=[],s=new Set,n=r.split(/\r?\n/);for(let o of n){let m=o.trim(),l=m.match(/^\$?([A-Za-z][A-Za-z0-9]*)\s*(?:=|:)?\s*(-?\d+)$/);if(l){let a=`$${l[1]}`,h=Number(l[2]);s.has(a)||(t.push({name:a,value:h}),s.add(a));continue}if(l=m.match(/^\$?([A-Za-z][A-Za-z0-9]*)\s*(?:=|:)?\s*0x([0-9a-fA-F]+)$/),l){let a=`$${l[1]}`,h=parseInt(l[2],16);s.has(a)||(t.push({name:a,value:h}),s.add(a))}}return $e(t)}function ve(r){let t=[],s=new Set,n=r.split(/\r?\n/);for(let o of n){let m=o.trim(),l=m.match(/0x[0-9a-fA-F]{8}/);if(!l)continue;let a=l[0],h=m.match(/0x[0-9a-fA-F]{1,8}/g)??[],p;for(let i of h)if(i.toLowerCase()!==a.toLowerCase()){p=i;break}!p||s.has(a)||(t.push({address:a,value:parseInt(p,16)}),s.add(a))}return fe(t)}function he(r,t){let s=[],n=r.split(/\r?\n/);for(let o of n){let m=o.trim(),l=m.match(/line\s+(\d+)\s+column\s+(\d+)\s*:\s*(.*)$/i)||m.match(/line\s+(\d+)\s*:\s*(.*)$/i);if(!l)continue;let a=Number(l[1]),h=l.length>=4?Number(l[2]):1,p=l.length>=4?l[3]:l[2],i=Math.max(0,a-1),$=Math.max(0,h-1);if(i>=t.lineCount)continue;let f=t.lineAt(i),S=Math.min($,f.text.length),g=t.getWordRangeAtPosition(new e.Position(i,S))??new e.Range(i,S,i,Math.min(S+1,f.text.length));s.push(new e.Diagnostic(g,p||m,e.DiagnosticSeverity.Error))}return s}function $e(r){let t=["$zero","$at","$v0","$v1","$a0","$a1","$a2","$a3","$t0","$t1","$t2","$t3","$t4","$t5","$t6","$t7","$s0","$s1","$s2","$s3","$s4","$s5","$s6","$s7","$t8","$t9","$k0","$k1","$gp","$sp","$fp","$ra","$pc","$hi","$lo"],s=new Map(t.map((n,o)=>[n,o]));return[...r].sort((n,o)=>{let m=s.get(n.name)??Number.MAX_SAFE_INTEGER,l=s.get(o.name)??Number.MAX_SAFE_INTEGER;return m-l||n.name.localeCompare(o.name)})}function fe(r){return[...r].sort((t,s)=>parseInt(t.address,16)-parseInt(s.address,16))}0&&(module.exports={activate,deactivate});
