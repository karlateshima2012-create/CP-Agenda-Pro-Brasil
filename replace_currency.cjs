const fs = require('fs');
const glob = require('glob');

const files = glob.sync('components/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace yen helper definition
  content = content.replace(/const yen = \(v: number\) => `¥\$\{Math\.round\(v\)\.toLocaleString\('ja-JP'\)\}`;/g, "const brl = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;");

  // Replace usages of yen(
  content = content.replace(/\byen\(/g, "brl(");

  // Replace hardcoded strings
  content = content.replace(/Valor \(¥\)/g, "Valor (R$)");
  content = content.replace(/Preço \(¥\)/g, "Preço (R$)");
  content = content.replace(/¥ \{/g, "R$ {");
  content = content.replace(/¥/g, "R$");
  
  // Replace toLocaleString('ja-JP') to 'pt-BR'
  content = content.replace(/toLocaleString\('ja-JP'\)/g, "toLocaleString('pt-BR')");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
