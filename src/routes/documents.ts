import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { authenticate } from './auth'
import { dbGet, dbAll, dbRun } from '../database/init'

const router = Router()
router.use(authenticate)

async function generateDocCode(projectId: string, docCategory: string): Promise<string> {
  const project = await dbGet('SELECT project_code FROM projects WHERE id = ?', [projectId])
  if (!project) return uuidv4().slice(0, 8)
  const prefix = project.project_code
  const catSuffix = docCategory ? docCategory.charAt(0) : 'Z'
  const row = await dbGet('SELECT COUNT(*) as cnt FROM documents WHERE project_id = ? AND doc_category = ?', [projectId, docCategory || ''])
  return `${prefix}-${catSuffix}${String((row?.cnt || 0) + 1).padStart(3, '0')}`
}

// ─── Archive catalog ───
router.get('/archive/catalog', async (req, res) => {
  try {
    const { project_id, sort_by = 'custom', sort_order = 'asc' } = req.query
    let sql = `
      SELECT d.id, d.doc_code, d.doc_name, d.doc_type, d.doc_category,
             d.status, d.sort_order, d.created_at, d.updated_at,
             p.name as project_name, p.project_code,
             t.name as template_name, t.template_code
      FROM documents d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN templates t ON d.template_id = t.id WHERE 1=1`
    const params: any[] = []
    if (project_id) { sql += ' AND d.project_id = ?'; params.push(project_id) }

    if (sort_by === 'custom') {
      sql += ' ORDER BY d.sort_order ASC, d.doc_category ASC, d.doc_code ASC'
    } else {
      const validFields: Record<string, string> = {
        doc_code: 'd.doc_code', doc_name: 'd.doc_name', doc_category: 'd.doc_category',
        doc_type: 'd.doc_type', created_at: 'd.created_at', updated_at: 'd.updated_at', status: 'd.status',
      }
      const field = validFields[sort_by as string] || 'd.doc_category'
      sql += ` ORDER BY ${field} ${sort_order === 'desc' ? 'DESC' : 'ASC'}, d.doc_code ASC`
    }

    const items = await dbAll(sql, params)
    const categoryStats: Record<string, number> = {}
    items.forEach((item: any) => {
      const cat = item.doc_category || '未分类'
      categoryStats[cat] = (categoryStats[cat] || 0) + 1
    })
    res.json({ success: true, data: { items, total: items.length, category_stats: categoryStats } })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Save reorder ───
router.put('/archive/reorder', async (req, res) => {
  try {
    const { orders } = req.body
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ success: false, message: '无效的排序数据' })
    }
    await Promise.all(orders.map((item: { id: string; sort_order: number }) =>
      dbRun("UPDATE documents SET sort_order = ?, updated_at = datetime('now') WHERE id = ?", [item.sort_order, item.id])
    ))
    res.json({ success: true, message: '排序保存成功' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Export catalog ───
router.get('/archive/export', async (req, res) => {
  try {
    const { project_id, format = 'csv' } = req.query
    let sql = `SELECT d.doc_code, d.doc_name, d.doc_category, d.doc_type, p.name as project_name,
               p.project_code, CASE d.status WHEN 'draft' THEN '草稿' WHEN 'reviewing' THEN '审核中'
               WHEN 'approved' THEN '已批准' WHEN 'rejected' THEN '已驳回' ELSE d.status END as status,
               datetime(d.created_at,'localtime') as created_at, datetime(d.updated_at,'localtime') as updated_at
               FROM documents d LEFT JOIN projects p ON d.project_id = p.id WHERE 1=1`
    const params: any[] = []
    if (project_id) { sql += ' AND d.project_id = ?'; params.push(project_id) }
    sql += ' ORDER BY d.doc_category, d.doc_code'
    const items = await dbAll(sql, params)
    if (format === 'json') { res.json({ success: true, data: items }); return }
    const headers = Object.keys(items[0] || {})
    let csv = '\uFEFF' + headers.join(',') + '\n'
    items.forEach((row: any) => {
      csv += headers.map(h => {
        const v = String(row[h] || '')
        return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
      }).join(',') + '\n'
    })
    res.setHeader('Content-Type', 'text/csv;charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=archive_${new Date().toISOString().slice(0,10)}.csv`)
    res.send(csv)
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── List documents ───
router.get('/', async (req, res) => {
  try {
    const { project_id, status, doc_category, page = 1, size = 100 } = req.query
    let sql = 'SELECT d.*, p.name as project_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id WHERE 1=1'
    const params: any[] = []
    if (project_id) { sql += ' AND d.project_id = ?'; params.push(project_id) }
    if (status) { sql += ' AND d.status = ?'; params.push(status) }
    if (doc_category) { sql += ' AND d.doc_category = ?'; params.push(doc_category) }
    const totalRow = await dbGet(sql.replace('SELECT d.*, p.name as project_name', 'SELECT COUNT(*) as cnt'), params)
    const total = totalRow?.cnt || 0
    sql += ' ORDER BY d.doc_category, d.doc_code, d.created_at DESC LIMIT ? OFFSET ?'
    const items = await dbAll(sql, [...params, Number(size), (Number(page) - 1) * Number(size)])
    res.json({ success: true, data: { items, total, page: Number(page), size: Number(size) } })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Get document ───
router.get('/:id', async (req, res) => {
  try {
    const doc = await dbGet(
      `SELECT d.*, p.name as project_name, p.project_code, p.construction_unit, p.supervision_unit, p.design_unit, p.owner_unit, p.location as project_location
       FROM documents d LEFT JOIN projects p ON d.project_id = p.id WHERE d.id = ?`,
      [req.params.id]
    )
    if (!doc) return res.status(404).json({ success: false, message: '资料不存在' })
    if (doc.template_id) doc.template_info = await dbGet('SELECT * FROM templates WHERE id = ?', [doc.template_id])
    res.json({ success: true, data: doc })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Create document ───
router.post('/', async (req, res) => {
  try {
    const { project_id, template_id, doc_code, doc_name, doc_type, doc_category, content, created_by } = req.body
    if (!project_id || !doc_name) return res.status(400).json({ success: false, message: '项目ID和资料名称不能为空' })

    const id = uuidv4()
    const autoCode = doc_code || await generateDocCode(project_id, doc_category)

    let autoContent = content || ''
    if (template_id && !autoContent) {
      const template = await dbGet('SELECT * FROM templates WHERE id = ?', [template_id])
      if (template) {
        const project = await dbGet('SELECT * FROM projects WHERE id = ?', [project_id])
        let schema: any = null
        try { schema = typeof template.table_schema === 'string' ? JSON.parse(template.table_schema) : template.table_schema } catch { schema = null }
        const fieldValues: Record<string, string> = {}
        if (schema?.fields && project) {
          for (const field of schema.fields) {
            if (field.name === '工程名称' && project.name) fieldValues[field.name] = project.name
            else if (field.name === '监理单位' && project.supervision_unit) fieldValues[field.name] = project.supervision_unit
            else if (field.name === '施工单位' && project.construction_unit) fieldValues[field.name] = project.construction_unit
            else if (field.name === '设计单位' && project.design_unit) fieldValues[field.name] = project.design_unit
            else if (field.name === '业主单位' && project.owner_unit) fieldValues[field.name] = project.owner_unit
            else if (field.name === '编号') fieldValues[field.name] = autoCode
          }
        }
        autoContent = JSON.stringify({ fieldValues, signatureDates: {}, schema, defaultContent: template.default_content || '' })
      }
    }

    await dbRun(
      `INSERT INTO documents (id, project_id, template_id, doc_code, doc_name, doc_type, doc_category, content, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [id, project_id, template_id || null, autoCode, doc_name, doc_type || null, doc_category || null, autoContent, created_by || null]
    )
    const doc = await dbGet('SELECT * FROM documents WHERE id = ?', [id])
    res.status(201).json({ success: true, data: doc })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Update document ───
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { doc_code, doc_name, doc_type, doc_category, content, status } = req.body
    const doc = await dbGet('SELECT 1 FROM documents WHERE id = ?', [id])
    if (!doc) return res.status(404).json({ success: false, message: '资料不存在' })
    await dbRun(
      `UPDATE documents SET doc_code=?, doc_name=?, doc_type=?, doc_category=?, content=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [doc_code, doc_name, doc_type, doc_category, content, status || 'draft', id]
    )
    const updated = await dbGet('SELECT * FROM documents WHERE id = ?', [id])
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Delete document ───
router.delete('/:id', async (req, res) => {
  try {
    const doc = await dbGet('SELECT 1 FROM documents WHERE id = ?', [req.params.id])
    if (!doc) return res.status(404).json({ success: false, message: '资料不存在' })
    await dbRun('DELETE FROM documents WHERE id = ?', [req.params.id])
    res.json({ success: true, message: '删除成功' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Submit for review ───
router.post('/:id/submit-review', async (req, res) => {
  try {
    const doc = await dbGet('SELECT 1 FROM documents WHERE id = ?', [req.params.id])
    if (!doc) return res.status(404).json({ success: false, message: '资料不存在' })
    await dbRun("UPDATE documents SET status='reviewing', updated_at=CURRENT_TIMESTAMP WHERE id=?", [req.params.id])
    res.json({ success: true, message: '提交审核成功' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Review document ───
router.post('/:id/review', async (req, res) => {
  try {
    const { action, reviewed_by, review_comments } = req.body
    const doc = await dbGet('SELECT 1 FROM documents WHERE id = ?', [req.params.id])
    if (!doc) return res.status(404).json({ success: false, message: '资料不存在' })
    const status = action === 'approve' ? 'approved' : 'rejected'
    await dbRun('UPDATE documents SET status=?, reviewed_by=?, review_comments=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [status, reviewed_by, review_comments || null, req.params.id])
    res.json({ success: true, message: action === 'approve' ? '审核通过' : '审核驳回' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export { router as documentRouter }
