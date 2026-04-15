/**
 * 文档管理路由
 */

const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

// 获取文档列表
router.get('/', (req, res) => {
  try {
    const { project_id, doc_type, status, keyword, page = 1, pageSize = 20 } = req.query;
    let sql = `
      SELECT d.*, p.name as project_name 
      FROM documents d 
      LEFT JOIN projects p ON d.project_id = p.id 
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      sql += ' AND d.project_id = ?';
      params.push(project_id);
    }

    if (doc_type) {
      sql += ' AND d.doc_type = ?';
      params.push(doc_type);
    }

    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND (d.doc_name LIKE ? OR d.doc_code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const countSql = sql.replace('SELECT d.*, p.name as project_name', 'SELECT COUNT(*) as total');
    const total = db.prepare(countSql).get(...params).total;

    sql += ' ORDER BY d.updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

    const documents = db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: documents,
      pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取单个文档
router.get('/:id', (req, res) => {
  try {
    const doc = db.prepare(`
      SELECT d.*, p.name as project_name 
      FROM documents d 
      LEFT JOIN projects p ON d.project_id = p.id 
      WHERE d.id = ?
    `).get(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' });
    }

    // 获取附件列表
    const attachments = db.prepare('SELECT * FROM attachments WHERE document_id = ?').all(req.params.id);

    // 获取工作流记录
    const workflowLogs = db.prepare(`
      SELECT * FROM workflow_logs WHERE document_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    res.json({ 
      success: true, 
      data: { ...doc, attachments, workflowLogs } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建文档
router.post('/', (req, res) => {
  try {
    const {
      project_id, doc_code, doc_name, doc_type, doc_category,
      template_id, content, created_by
    } = req.body;

    if (!project_id || !doc_name) {
      return res.status(400).json({ success: false, message: '项目ID和文档名称不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO documents (
        project_id, doc_code, doc_name, doc_type, doc_category,
        template_id, content, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      project_id, doc_code, doc_name, doc_type, doc_category,
      template_id, content, created_by
    );

    res.status(201).json({
      success: true,
      message: '文档创建成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新文档
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' });
    }

    const allowedFields = ['doc_code', 'doc_name', 'doc_type', 'doc_category', 'content', 'file_path'];
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: '没有可更新的字段' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    res.json({ success: true, message: '文档更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除文档
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 删除附件
    db.prepare('DELETE FROM attachments WHERE document_id = ?').run(id);
    
    // 删除工作流记录
    db.prepare('DELETE FROM workflow_logs WHERE document_id = ?').run(id);
    
    // 删除文档
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    res.json({ success: true, message: '文档删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
