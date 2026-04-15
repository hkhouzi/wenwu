/**
 * 工作流路由
 */

const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

// 状态流转定义
const STATUS_FLOW = {
  'draft': ['reviewing'],           // 草稿 -> 审核中
  'reviewing': ['draft', 'approved'], // 审核中 -> 草稿/已批准
  'approved': ['archived'],         // 已批准 -> 已归档
  'archived': []                    // 已归档 -> 终态
};

const STATUS_LABELS = {
  'draft': '草稿',
  'reviewing': '审核中',
  'approved': '已批准',
  'archived': '已归档'
};

// 获取文档工作流历史
router.get('/history/:documentId', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM workflow_logs 
      WHERE document_id = ? 
      ORDER BY created_at DESC
    `).all(req.params.documentId);

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 提交审核
router.post('/submit/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    const { operator, comment } = req.body;

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' });
    }

    if (doc.status !== 'draft') {
      return res.status(400).json({ 
        success: false, 
        message: '只有草稿状态的文档可以提交审核' 
      });
    }

    // 更新文档状态
    db.prepare("UPDATE documents SET status = 'reviewing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(documentId);

    // 记录工作流日志
    db.prepare(`
      INSERT INTO workflow_logs (document_id, action, from_status, to_status, operator, comment)
      VALUES (?, 'submit', 'draft', 'reviewing', ?, ?)
    `).run(documentId, operator, comment || '提交审核');

    res.json({ success: true, message: '文档已提交审核' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审核通过
router.post('/approve/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    const { operator, comment } = req.body;

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' });
    }

    if (doc.status !== 'reviewing') {
      return res.status(400).json({ 
        success: false, 
        message: '只有审核中状态的文档可以批准' 
      });
    }

    // 更新文档状态
    db.prepare(`
      UPDATE documents 
      SET status = 'approved', approved_by = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(operator, documentId);

    // 记录工作流日志
    db.prepare(`
      INSERT INTO workflow_logs (document_id, action, from_status, to_status, operator, comment)
      VALUES (?, 'approve', 'reviewing', 'approved', ?, ?)
    `).run(documentId, operator, comment || '审核通过');

    res.json({ success: true, message: '文档审核通过' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审核驳回
router.post('/reject/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    const { operator, comment } = req.body;

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' });
    }

    if (doc.status !== 'reviewing') {
      return res.status(400).json({ 
        success: false, 
        message: '只有审核中状态的文档可以驳回' 
      });
    }

    // 更新文档状态
    db.prepare(`
      UPDATE documents 
      SET status = 'draft', reviewed_by = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(operator, documentId);

    // 记录工作流日志
    db.prepare(`
      INSERT INTO workflow_logs (document_id, action, from_status, to_status, operator, comment)
      VALUES (?, 'reject', 'reviewing', 'draft', ?, ?)
    `).run(documentId, operator, comment || '审核驳回');

    res.json({ success: true, message: '文档已驳回' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 归档
router.post('/archive/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    const { operator, comment } = req.body;

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' });
    }

    if (doc.status !== 'approved') {
      return res.status(400).json({ 
        success: false, 
        message: '只有已批准状态的文档可以归档' 
      });
    }

    // 更新文档状态
    db.prepare("UPDATE documents SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(documentId);

    // 记录工作流日志
    db.prepare(`
      INSERT INTO workflow_logs (document_id, action, from_status, to_status, operator, comment)
      VALUES (?, 'archive', 'approved', 'archived', ?, ?)
    `).run(documentId, operator, comment || '文档归档');

    res.json({ success: true, message: '文档已归档' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取状态配置
router.get('/status-config', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      flow: STATUS_FLOW, 
      labels: STATUS_LABELS 
    } 
  });
});

module.exports = router;
