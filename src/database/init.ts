import sqlite3 from 'sqlite3'
import pg from 'pg'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Database type detection ───
const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase()
const IS_POSTGRES = DB_TYPE === 'postgresql'

// ─── SQLite setup ───
const DB_DIR = path.join(__dirname, '../../database')
const DB_PATH = path.join(DB_DIR, 'heritagedoc.db')

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

let sqliteDb: sqlite3.Database

const getSqliteDb = (): sqlite3.Database => {
  if (!sqliteDb) {
    sqliteDb = new sqlite3.Database(DB_PATH)
    sqliteDb.run('PRAGMA foreign_keys = ON')
  }
  return sqliteDb
}

// ─── PostgreSQL setup ───
const pgPool = new pg.Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || 'heritagedoc',
  user: process.env.POSTGRES_USER || 'heritagedoc',
  password: process.env.POSTGRES_PASSWORD || '',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pgPool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
})

// ─── Unified Database Interface ───
export const getDb = () => {
  if (IS_POSTGRES) return pgPool
  return getSqliteDb()
}

// Promise-wrapped helpers for PostgreSQL
const pgQuery = async (sql: string, params: any[] = []): Promise<any> => {
  const client = await pgPool.connect()
  try {
    const result = await client.query(sql, params)
    return result.rows
  } finally {
    client.release()
  }
}

const pgGet = async (sql: string, params: any[] = []): Promise<any> => {
  const rows = await pgQuery(sql + ' LIMIT 1', params)
  return rows[0] || null
}

const pgRun = async (sql: string, params: any[] = []): Promise<void> => {
  await pgQuery(sql, params)
}

// Promise-wrapped helpers for SQLite
const sqliteGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    getSqliteDb().get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row)
    })
  })
}

const sqliteRun = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    getSqliteDb().run(sql, params, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// ─── Type-safe DB helpers (auto-detect) ───
export const dbGet = async (sql: string, params: any[] = []): Promise<any> => {
  if (IS_POSTGRES) return pgGet(sql, params)
  return sqliteGet(sql, params)
}

export const dbAll = async (sql: string, params: any[] = []): Promise<any[]> => {
  if (IS_POSTGRES) return pgQuery(sql, params)
  return new Promise((resolve, reject) => {
    getSqliteDb().all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

export const dbRun = async (sql: string, params: any[] = []): Promise<void> => {
  if (IS_POSTGRES) return pgRun(sql, params)
  return sqliteRun(sql, params)
}

// ─── PostgreSQL Schema ───
const POSTGRES_SCHEMA = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'pending',
  email_verified BOOLEAN DEFAULT FALSE,
  email_verify_token VARCHAR(255),
  email_verify_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects (belongs to an organization/owner)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_user_id UUID REFERENCES users(id),
  plan VARCHAR(20) DEFAULT 'free',
  max_projects INTEGER DEFAULT 3,
  max_storage_mb INTEGER DEFAULT 1024,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  heritage_type VARCHAR(50) NOT NULL,
  heritage_level VARCHAR(100),
  location VARCHAR(255),
  owner_unit VARCHAR(255),
  construction_unit VARCHAR(255),
  supervision_unit VARCHAR(255),
  design_unit VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, project_code)
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID,
  doc_code VARCHAR(50),
  doc_name VARCHAR(255) NOT NULL,
  doc_type VARCHAR(50),
  doc_category VARCHAR(50),
  content JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft',
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  review_comments TEXT,
  approved_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates (system-level, shared across orgs)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  heritage_type VARCHAR(50),
  doc_category VARCHAR(50),
  doc_type VARCHAR(50),
  table_schema JSONB,
  default_content TEXT,
  description TEXT,
  original_file_path TEXT,
  original_file_name TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization invites
CREATE TABLE IF NOT EXISTS org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'editor',
  invite_token VARCHAR(255) UNIQUE,
  invited_by UUID REFERENCES users(id),
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Document versions (for history)
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content JSONB,
  version INTEGER NOT NULL,
  changed_by UUID REFERENCES users(id),
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(doc_category);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(email_verify_token);
`

// ─── SQLite Schema ───
const SQLITE_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'pending',
  email_verified INTEGER DEFAULT 0,
  email_verify_token TEXT,
  email_verify_token_expires INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT,
  plan TEXT DEFAULT 'free',
  max_projects INTEGER DEFAULT 3,
  max_storage_mb INTEGER DEFAULT 1024,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  project_code TEXT NOT NULL,
  name TEXT NOT NULL,
  heritage_type TEXT NOT NULL,
  heritage_level TEXT,
  location TEXT,
  owner_unit TEXT,
  construction_unit TEXT,
  supervision_unit TEXT,
  design_unit TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active',
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  template_id TEXT,
  doc_code TEXT,
  doc_name TEXT NOT NULL,
  doc_type TEXT,
  doc_category TEXT,
  content TEXT,
  status TEXT DEFAULT 'draft',
  sort_order INTEGER DEFAULT 0,
  created_by TEXT,
  reviewed_by TEXT,
  review_comments TEXT,
  approved_by TEXT,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  template_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  heritage_type TEXT,
  doc_category TEXT,
  doc_type TEXT,
  table_schema TEXT,
  default_content TEXT,
  description TEXT,
  original_file_path TEXT,
  original_file_name TEXT,
  is_system INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS org_invites (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'editor',
  invite_token TEXT UNIQUE,
  invited_by TEXT,
  accepted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT,
  version INTEGER NOT NULL,
  changed_by TEXT,
  change_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`

// ─── Seed data: System templates ───
const SYSTEM_TEMPLATES: Array<{
  template_code: string; name: string; heritage_type: string;
  doc_category: string; doc_type: string; description: string;
  fields: any[]; default_content: string;
}> = [
  { template_code: '前期-001', name: '文物保护工程立项申请表', heritage_type: '古建筑', doc_category: '前期阶段', doc_type: '申请表', description: '文物保护工程立项申请', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '申请单位', type: 'text', required: true }, { name: '申请内容', type: 'textarea', required: true }, { name: '附件清单', type: 'textarea' }], default_content: '致：（审批单位）\n我单位申请 文物保护工程立项，请审批。' },
  { template_code: '前期-002', name: '文物保护工程可行性研究报告', heritage_type: '古建筑', doc_category: '前期阶段', doc_type: '报告', description: '工程可行性分析报告', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '勘察设计单位', type: 'text' }, { name: '研究内容', type: 'textarea', required: true }, { name: '可行性结论', type: 'textarea' }], default_content: '本报告对 工程进行全面可行性分析。' },
  { template_code: 'A.1', name: '工程开工报审表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '报审表', description: '施工单位申请开工的报审文件', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '监理单位', type: 'text', required: true }, { name: '申请内容', type: 'textarea', required: true }, { name: '附件清单', type: 'textarea' }], default_content: '致：（监理单位）\n我方承担的 工程，已完成施工前各项准备工作，具备开工条件。' },
  { template_code: 'A.2', name: '工程开工报告表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '报告表', description: '工程正式开工的书面报告', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '勘察设计单位', type: 'text' }, { name: '工程预算值', type: 'number' }], default_content: '本工程正式开工。' },
  { template_code: 'A.3', name: '施工组织设计（方案）报审表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '报审表', description: '施工组织设计或施工方案报监理审批', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '监理单位', type: 'text', required: true }, { name: '方案内容简述', type: 'textarea', required: true }], default_content: '致：（监理单位）\n我方已完成施工组织设计（方案）编制，请予以审查。' },
  { template_code: 'A.4', name: '分包单位资格报审表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '报审表', description: '分包单位资质及能力审查报批', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '分包单位名称', type: 'text', required: true }, { name: '分包工程名称', type: 'text' }], default_content: '经考察，我方认为拟选择的分包单位具有相应资质。' },
  { template_code: 'A.5', name: '隐蔽工程现场检查申请表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '申请表', description: '隐蔽工程覆盖前的检查申请', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '分部分项工程名称', type: 'text', required: true }, { name: '检查内容及简图', type: 'textarea' }], default_content: '申请对以下隐蔽工程进行检查。' },
  { template_code: 'A.6', name: '分部/分项工程报验申请表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '申请表', description: '分部或分项工程完成后的验收申请', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '分部分项工程名称', type: 'text', required: true }, { name: '附件清单', type: 'textarea' }], default_content: '致：（监理单位）\n我方已完成分部/分项工程施工，请予以审查和验收。' },
  { template_code: 'A.7', name: '工程材料/构配件/设备报审表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '报审表', description: '进场材料构配件设备的报审', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '进场日期', type: 'date', required: true }, { name: '材料构配件设备清单', type: 'textarea', required: true }, { name: '拟用部位', type: 'text' }], default_content: '我方于 年 月 日进场的工程材料/构配件/设备数量如下，请予以审核。' },
  { template_code: 'A.8', name: '古建筑拆卸构件登记一览表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '登记表', description: '古建筑拆卸构件的详细登记与处理记录', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '构件清单', type: 'textarea', required: true }], default_content: '用于记录古建筑拆卸构件的详细信息。' },
  { template_code: 'A.9', name: '工程款支付申请表', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '申请表', description: '工程进度款支付申请', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '监理单位', type: 'text', required: true }, { name: '完成工作内容', type: 'textarea', required: true }, { name: '支付金额大写', type: 'text', required: true }, { name: '支付金额小写', type: 'number', required: true }], default_content: '致：（监理单位）\n我方已完成 工作，申请支付工程款。' },
  { template_code: 'A.10', name: '监理工程师通知回复单', heritage_type: '古建筑', doc_category: '施工阶段', doc_type: '回复单', description: '施工单位回复监理工程师通知的文件', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '监理单位', type: 'text', required: true }, { name: '通知编号', type: 'text', required: true }, { name: '完成工作内容', type: 'textarea', required: true }], default_content: '致：（监理单位）\n我方接到编号为 的监理工程师通知后，已按要求完成 工作。' },
  { template_code: '验收-001', name: '工程竣工验收申请报告', heritage_type: '古建筑', doc_category: '竣工验收', doc_type: '申请报告', description: '工程竣工后的验收申请', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '竣工内容', type: 'textarea', required: true }, { name: '自检结果', type: 'textarea' }], default_content: '致：（建设单位）\n我方已按合同要求完成 工程，特申请竣工验收。' },
  { template_code: '验收-002', name: '工程竣工报告', heritage_type: '古建筑', doc_category: '竣工验收', doc_type: '报告', description: '工程竣工的全面总结报告', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '竣工日期', type: 'date', required: true }, { name: '工程概况', type: 'textarea', required: true }], default_content: '本工程于 年 月 日竣工，以下是竣工总结。' },
  { template_code: 'C.1', name: '监理工作联系单', heritage_type: '古建筑', doc_category: '通用表式', doc_type: '联系单', description: '监理与施工各单位间的工作联系', fields: [{ name: '工程名称', type: 'text', required: true }, { name: '编号', type: 'text', required: true }, { name: '联系内容', type: 'textarea', required: true }], default_content: '致：（单位）\n现就 事项联系，请知悉。' },
]

// ─── Initialize Database ───
export const initializeDatabase = async (): Promise<void> => {
  console.log(`[DB] Initializing ${IS_POSTGRES ? 'PostgreSQL' : 'SQLite'} database...`)

  try {
    if (IS_POSTGRES) {
      // Test connection
      const client = await pgPool.connect()
      await client.query('SELECT 1')
      client.release()
      console.log('[DB] PostgreSQL connection established')

      // Run schema
      const statements = POSTGRES_SCHEMA.split(';').filter(s => s.trim())
      for (const stmt of statements) {
        if (stmt.trim()) await pgQuery(stmt)
      }
      console.log('[DB] PostgreSQL schema applied')

      // Seed system templates
      for (const t of SYSTEM_TEMPLATES) {
        const exists = await pgGet('SELECT 1 FROM templates WHERE template_code = $1', [t.template_code])
        if (!exists) {
          await pgQuery(`
            INSERT INTO templates (id, template_code, name, heritage_type, doc_category, doc_type, table_schema, default_content, description, is_system)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, TRUE)
          `, [t.template_code, t.name, t.heritage_type, t.doc_category, t.doc_type, JSON.stringify({ fields: t.fields }), t.default_content, t.description])
        }
      }
    } else {
      // SQLite
      const statements = SQLITE_SCHEMA.split(';').filter(s => s.trim())
      for (const stmt of statements) {
        if (stmt.trim()) await sqliteRun(stmt)
      }

      // Migration: add missing columns to existing database (ignore errors if column exists)
      const migrations = [
        "ALTER TABLE templates ADD COLUMN is_system INTEGER DEFAULT 0",
        "ALTER TABLE documents ADD COLUMN review_comments TEXT",
        "ALTER TABLE documents ADD COLUMN version INTEGER DEFAULT 1",
        "ALTER TABLE users ADD COLUMN email TEXT",
        "ALTER TABLE users ADD COLUMN password_hash TEXT",
        "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN email_verify_token TEXT",
        "ALTER TABLE users ADD COLUMN email_verify_token_expires INTEGER",
      ]
      for (const m of migrations) {
        try { await sqliteRun(m) } catch { /* ignore if column exists */ }
      }

      // Seed system templates
      for (const t of SYSTEM_TEMPLATES) {
        const exists = await sqliteGet('SELECT 1 FROM templates WHERE template_code = ?', [t.template_code])
        if (!exists) {
          await sqliteRun(`
            INSERT INTO templates (id, template_code, name, heritage_type, doc_category, doc_type, table_schema, default_content, description, is_system)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [uuidv4(), t.template_code, t.name, t.heritage_type, t.doc_category, t.doc_type, JSON.stringify({ fields: t.fields }), t.default_content, t.description])
        }
      }
    }

    const count = await dbGet(IS_POSTGRES ? 'SELECT COUNT(*) as cnt FROM templates WHERE is_system = TRUE' : 'SELECT COUNT(*) as cnt FROM templates WHERE is_system = 1', [])
    console.log(`[DB] Initialized — ${count?.cnt || 0} system templates`)
  } catch (err) {
    console.error('[DB] Initialization failed:', err)
    throw err
  }
}

// Close pool on shutdown
process.on('SIGTERM', async () => {
  if (IS_POSTGRES) {
    await pgPool.end()
    console.log('[DB] PostgreSQL pool closed')
  }
})
