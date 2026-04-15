const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database/heritagedoc.db');
const db = new sqlite3.Database(DB_PATH);

db.all('SELECT template_code, name, doc_category, doc_type FROM templates', (err, rows) => {
  if (err) {
    console.error('查询错误:', err.message);
  } else {
    console.log('数据库中的模板:');
    console.log('='.repeat(70));
    rows.forEach(row => {
      console.log(`${row.template_code.padEnd(6)} | ${row.name.padEnd(30)} | ${row.doc_category}`);
    });
    console.log('='.repeat(70));
    console.log('总计:', rows.length, '个模板');
  }
  db.close();
});
