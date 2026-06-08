const fs = require('fs');
const glob = require('glob');

const files = glob.sync('**/*.{ts,tsx}', { ignore: ['node_modules/**'] });

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/Asia\/Tokyo/g, "America/Sao_Paulo");
  content = content.replace(/getNowJST/g, "getNowBRT");
  content = content.replace(/nowJST/g, "nowBRT");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated timezone in ${file}`);
  }
});
