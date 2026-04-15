/**
 * 项目管理路由
 */

const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

// 获取项目列表
router.get('/', (req, res) => {
  try {
    const { status, keyword, page = 1, pageSize = 20 } = req.query;
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND (name LIKE ? OR project_code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 获取总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const total = db.prepare(countSql).get(...params).total;

    // 分页
    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

    const projects = db.prepare(sql).all(...params);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取单个项目
router.get('/:id', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    // 获取项目下的文档统计
    const docStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
      FROM documents WHERE project_id = ?
    `).get(req.params.id);

    res.json({ success: true, data: { ...project, docStats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建项目
router.post('/', (req, res) => {
  try {
    const {
      name, project_code, location, heritage_level, heritage_type,
      owner_unit, construction_unit, supervision_unit, design_unit,
      start_date, end_date
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '项目名称不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO projects (
        name, project_code, location, heritage_level, heritage_type,
        owner_unit, construction_unit, supervision_unit, design_unit,
        start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, project_code, location, heritage_level, heritage_type,
      owner_unit, construction_unit, supervision_unit, design_unit,
      start_date, end_date
    );

    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, message: '项目编号已存在' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新项目
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (['name', 'project_code', 'location', 'heritage_level', 'heritage_type',
           'owner_unit', 'construction_unit', 'supervision_unit', 'design_unit',
           'start_date', 'end_date', 'status'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: '没有可更新的字段' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    res.json({ success: true, message: '项目更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除项目
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查项目下是否有文档
    const docCount = db.prepare('SELECT COUNT(*) as count FROM documents WHERE project_id = ?').get(id);
    
    if (docCount.count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `项目下有 ${docCount.count} 个文档，请先删除文档` 
      });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ success: true, message: '项目删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
