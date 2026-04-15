/**
 * 数据库初始化 - SQLite
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/heritagedoc.db');
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 创建表结构
const initDatabase = () => {
  // 项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      project_code TEXT UNIQUE,
      location TEXT,
      heritage_level TEXT,
      heritage_type TEXT,
      owner_unit TEXT,
      construction_unit TEXT,
      supervision_unit TEXT,
      design_unit TEXT,
      start_date DATE,
      end_date DATE,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 资料文档表
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      doc_code TEXT,
      doc_name TEXT NOT NULL,
      doc_type TEXT,
      doc_category TEXT,
      template_id INTEGER,
      content TEXT,
      file_path TEXT,
      status TEXT DEFAULT 'draft',
      created_by TEXT,
      reviewed_by TEXT,
      approved_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // 模板表
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_code TEXT UNIQUE,
      name TEXT NOT NULL,
      heritage_type TEXT,
      doc_category TEXT,
      doc_type TEXT,
      description TEXT,
      table_schema TEXT,
      default_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 同步已有模板表结构（补充缺失列）
  const existingCols = db.prepare("PRAGMA table_info(templates)").all().map(r => r.name);
  const neededCols = ['template_code', 'doc_category', 'doc_type', 'description', 'table_schema', 'default_content', 'updated_at'];
  neededCols.forEach(col => {
    if (!existingCols.includes(col)) {
      try { db.exec(`ALTER TABLE templates ADD COLUMN ${col} TEXT`); } catch {}
    }
  });

  // 工作流记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      operator TEXT,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    )
  `);

  // 附件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      file_type TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    )
  `);

  console.log('数据库表结构初始化完成');
};

module.exports = { db, initDatabase };
