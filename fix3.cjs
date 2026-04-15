const fs = require('fs');
['src/routes/documents.ts', 'src/routes/templates.ts'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/dbAll\(db,/g, 'dbAll(');
  c = c.replace(/dbGet\(db,/g, 'dbGet(');
  c = c.replace(/dbRun\(db,/g, 'dbRun(');
  c = c.replace(/generateDocCode\(db,/g, 'generateDocCode(');
  fs.writeFileSync(f, c);
  console.log('Fixed', f);
});
