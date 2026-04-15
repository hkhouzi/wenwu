// 批量修复 documents.ts 中的旧 API 调用
const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'src/routes/documents.ts')
let code = fs.readFileSync(file, 'utf8')

// 1. 去掉所有 "const db = getDb()"
code = code.replace(/const db = getDb\(\)\s*\n/g, '')

// 2. 把 db.get(db, sql, params) 改成 dbGet(sql, params)
code = code.replace(/db\.get\(db,\s*([^,]+),\s*([^)]+)\)/g, 'dbGet($1, $2)')

// 3. 把 db.all(db, sql, params) 改成 dbAll(sql, params)
code = code.replace(/db\.all\(db,\s*([^,]+),\s*([^)]+)\)/g, 'dbAll($1, $2)')

// 4. 把 db.run(db, sql, params) 改成 dbRun(sql, params)
code = code.replace(/db\.run\(db,\s*([^,]+),\s*([^)]+)\)/g, 'dbRun($1, $2)')

// 5. 把 generateDocCode(db, 改成 generateDocCode(
code = code.replace(/generateDocCode\(db,\s*/g, 'generateDocCode(')

// 6. 把 "db, " 模式（传给 dbGet/dbAll/dbRun 时的第一个参数 db）
// 已经在上面覆盖了

fs.writeFileSync(file, code)
console.log('Fixed documents.ts')
