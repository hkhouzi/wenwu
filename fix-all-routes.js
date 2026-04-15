// Fix all route files - replace old SQLite callback-style with new unified async API
const fs = require('fs')
const path = require('path')

function fixFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf8')
  let changed = false

  const original = code

  // 1. Remove old callback-style db helpers and "const db = getDb()"
  code = code.replace(/const dbAll = \(db: any, sql: string, params: any\[\]: any\[\]\): Promise<any\[\]> => \{[\s\S]*?\}\n\n/g, '')
  code = code.replace(/const dbGet = \(db: any, sql: string, params: any\[\]: any\[\]\): Promise<any> => \{[\s\S]*?\}\n\n/g, '')
  code = code.replace(/const dbRun = \(db: any, sql: string, params: any\[\]: any\[\]\): Promise<void> => \{[\s\S]*?\}\n\n/g, '')
  code = code.replace(/const db = getDb\(\)\s*\n/g, '')

  // 2. Replace db.get(db, sql, params) -> dbGet(sql, params)
  code = code.replace(/db\.get\(db,\s*/g, 'dbGet(')

  // 3. Replace db.all(db, sql, params) -> dbAll(sql, params)
  code = code.replace(/db\.all\(db,\s*/g, 'dbAll(')

  // 4. Replace db.run(db, sql, params) -> dbRun(sql, params)
  code = code.replace(/db\.run\(db,\s*/g, 'dbRun(')

  // 5. Replace generateDocCode(db, -> generateDocCode(
  code = code.replace(/generateDocCode\(db,\s*/g, 'generateDocCode(')

  // 6. For documents.ts: replace "import { getDb, dbGet, ..." -> just import { dbGet, ..."
  if (code.includes("import { getDb,")) {
    code = code.replace("import { getDb, dbGet, dbAll, dbRun } from '../database/init'", "import { dbGet, dbAll, dbRun } from '../database/init'")
  }

  // 7. For templates.ts: remove duplicate imports
  // The file now has both old getDb import AND new imports. Fix:
  if (code.includes("import { dbGet, dbAll, dbRun }") && code.includes("getDb }")) {
    // Remove getDb from import if present
    code = code.replace("import { dbGet, dbAll, dbRun } from '../database/init'", "")
    code = code.replace("import { getDb } from '../database/init'", "")
    // Re-add clean import
    code = code.replace("import { v4 as uuidv4 } from 'uuid'", "import { v4 as uuidv4 } from 'uuid'\nimport { dbGet, dbAll, dbRun } from '../database/init'")
  }

  // 8. Fix templates.ts: move router.use(optionalAuth) AFTER router definition
  // The current code has router.use(optionalAuth) before router is defined
  // Move it to after the const router = Router()
  if (code.includes('router.use(optionalAuth)') && code.includes('const router = Router()')) {
    // Remove the misplaced one
    code = code.replace(/router\.use\(optionalAuth\)\n\nconst upload/g, 'const upload')
    // Add after router = Router()
    code = code.replace('const router = Router()\n\n// System templates', 'const router = Router()\n\n// System templates are public, user templates need auth\nrouter.use(optionalAuth)\n')
  }

  if (code !== original) {
    fs.writeFileSync(filepath, code)
    console.log('Fixed:', filepath)
    changed = true
  }

  return changed
}

fixFile(path.join(__dirname, 'src/routes/documents.ts'))
fixFile(path.join(__dirname, 'src/routes/templates.ts'))
console.log('Done')
