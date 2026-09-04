const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');const files=require('./ui-font-scope.json');const bad=[];
for(const file of files){const lines=fs.readFileSync(path.join(root,file),'utf8').split(/\r?\n/);lines.forEach((line,i)=>{for(const m of line.matchAll(/(?:fontSize:\s*|fontSize=\{|font-size:\s*)(\d+(?:\.\d+)?)/g))if(Number(m[1])<12)bad.push(file+':'+(i+1)+' font '+m[1]);if(/adjustsFontSizeToFit|minimumFontScale/.test(line))bad.push(file+':'+(i+1)+' automatic text shrinking needs review');});}
if(bad.length){console.error(bad.join('\n'));process.exit(1);}console.log('Typography check passed: '+files.length+' release UI files, minimum 12px.');
