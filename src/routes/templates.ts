import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import mammoth from 'mammoth'
import { dbGet, dbAll, dbRun } from '../database/init'
import { optionalAuth } from './auth'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Upload config ───
const uploadDir = path.join(__dirname, '../../uploads/templates')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => { cb(null, uploadDir) },
  filename: (_req, file, cb) => { cb(null, `${uuidv4()}${path.extname(file.originalname)}`) },
})

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, ['.doc', '.docx', '.pdf'].includes(ext))
  },
})

const router = Router()

// System templates are public, user templates need auth
router.use(optionalAuth)

// ─── Generate doc code ───
async function generateDocCode(projectId: string, docCategory: string): Promise<string> {
  const project = await dbGet('SELECT project_code FROM projects WHERE id = ?', [projectId])
  if (!project) return uuidv4().slice(0, 8)
  const prefix = project.project_code
  const catSuffix = docCategory ? docCategory.charAt(0) : 'Z'
  const countRow = await dbGet(
    'SELECT COUNT(*) as cnt FROM documents WHERE project_id = ? AND doc_category = ?',
    [projectId, docCategory || '']
  )
  return `${prefix}-${catSuffix}${String((countRow?.cnt || 0) + 1).padStart(3, '0')}`
}

// ─── List templates ───
router.get('/', async (req: Request, res: Response) => {
  try {
    const { heritage_type, doc_category } = req.query
    let sql = 'SELECT * FROM templates WHERE 1=1'
    const params: any[] = []
    if (heritage_type) { sql += ' AND (heritage_type = ? OR heritage_type IS NULL)'; params.push(heritage_type) }
    if (doc_category) { sql += ' AND doc_category = ?'; params.push(doc_category) }
    sql += ' ORDER BY doc_category, template_code'
    const items = await dbAll(sql, params)
    res.json({ success: true, data: { items, total: items.length } })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Get template ───
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await dbGet('SELECT * FROM templates WHERE id = ?', [req.params.id])
    if (!template) return res.status(404).json({ success: false, message: '模板不存在' })
    res.json({ success: true, data: template })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Create template ───
router.post('/', async (req: Request, res: Response) => {
  try {
    const { template_code, name, heritage_type, doc_category, doc_type, table_schema, default_content, description } = req.body
    if (!template_code || !name) return res.status(400).json({ success: false, message: '模板编号和名称不能为空' })
    const exists = await dbGet('SELECT 1 FROM templates WHERE template_code = ?', [template_code])
    if (exists) return res.status(409).json({ success: false, message: '模板编号已存在' })
    const id = uuidv4()
    await dbRun(
      `INSERT INTO templates (id, template_code, name, heritage_type, doc_category, doc_type, table_schema, default_content, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, template_code, name, heritage_type || null, doc_category || null, doc_type || null, table_schema || null, default_content || null, description || null]
    )
    const template = await dbGet('SELECT * FROM templates WHERE id = ?', [id])
    res.status(201).json({ success: true, data: template })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Update template ───
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, heritage_type, doc_category, doc_type, table_schema, default_content, description } = req.body
    const template = await dbGet('SELECT 1 FROM templates WHERE id = ?', [id])
    if (!template) return res.status(404).json({ success: false, message: '模板不存在' })
    await dbRun(
      `UPDATE templates SET name=?, heritage_type=?, doc_category=?, doc_type=?, table_schema=?, default_content=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [name, heritage_type, doc_category, doc_type, table_schema, default_content, description, id]
    )
    const updated = await dbGet('SELECT * FROM templates WHERE id = ?', [id])
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Delete template ───
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const template = await dbGet('SELECT * FROM templates WHERE id = ?', [id])
    if (!template) return res.status(404).json({ success: false, message: '模板不存在' })
    if (template.original_file_path && fs.existsSync(template.original_file_path)) fs.unlinkSync(template.original_file_path)
    await dbRun('DELETE FROM templates WHERE id = ?', [id])
    res.json({ success: true, message: '删除成功' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Preview .docx ───
router.get('/:id/preview', async (req: Request, res: Response) => {
  try {
    const template = await dbGet('SELECT * FROM templates WHERE id = ?', [req.params.id])
    if (!template) return res.status(404).json({ success: false, message: '模板不存在' })
    if (!template.original_file_path || !fs.existsSync(template.original_file_path)) {
      return res.status(404).json({ success: false, message: '原始文件不存在' })
    }
    const ext = path.extname(template.original_file_path).toLowerCase()
    if (ext !== '.docx') return res.status(400).json({ success: false, message: '仅支持 .docx 格式预览' })
    const result = await mammoth.convertToHtml({ path: template.original_file_path })
    res.json({
      success: true,
      data: {
        html: result.value,
        warnings: result.messages.map((m: any) => m.message),
        template_name: template.name,
        template_code: template.template_code,
        original_file_name: template.original_file_name,
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Upload template file ───
router.post('/:id/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const template = await dbGet('SELECT * FROM templates WHERE id = ?', [id])
    if (!template) return res.status(404).json({ success: false, message: '模板不存在' })
    if (!req.file) return res.status(400).json({ success: false, message: '未上传文件' })
    if (template.original_file_path && fs.existsSync(template.original_file_path)) fs.unlinkSync(template.original_file_path)
    await dbRun(
      'UPDATE templates SET original_file_path=?, original_file_name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [req.file.path, req.file.originalname, id]
    )
    const updated = await dbGet('SELECT * FROM templates WHERE id = ?', [id])
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Delete template file ───
router.delete('/:id/file', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const template = await dbGet('SELECT * FROM templates WHERE id = ?', [id])
    if (!template) return res.status(404).json({ success: false, message: '模板不存在' })
    if (template.original_file_path && fs.existsSync(template.original_file_path)) fs.unlinkSync(template.original_file_path)
    await dbRun('UPDATE templates SET original_file_path=NULL, original_file_name=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?', [id])
    res.json({ success: true, message: '文件已删除' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Download template file ───
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const template = await dbGet('SELECT * FROM templates WHERE id = ?', [req.params.id])
    if (!template) return res.status(404).json({ success: false, message: '模板不存在' })
    if (!template.original_file_path || !fs.existsSync(template.original_file_path)) {
      return res.status(404).json({ success: false, message: '原始文件不存在' })
    }
    res.download(template.original_file_path, template.original_file_name || path.basename(template.original_file_path))
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Batch download list ───
router.get('/batch-download/all', async (req: Request, res: Response) => {
  try {
    const templates = await dbAll(
      "SELECT * FROM templates WHERE original_file_path IS NOT NULL AND original_file_path != '' ORDER BY doc_category, template_code"
    )
    if (templates.length === 0) return res.status(404).json({ success: false, message: '没有任何已上传原始文件的模板' })
    res.json({
      success: true,
      data: templates.map((t: any) => ({
        id: t.id, template_code: t.template_code, name: t.name,
        doc_category: t.doc_category, original_file_name: t.original_file_name,
        download_url: `/api/templates/${t.id}/download`,
      })),
    })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Use template to create document ───
router.post('/use', async (req: Request, res: Response) => {
  try {
    const { template_id, project_id } = req.body
    if (!template_id || !project_id) return res.status(400).json({ success: false, message: '模板ID和项目ID不能为空' })

    const template = await dbGet('SELECT * FROM templates WHERE id = ?', [template_id])
    if (!template) return res.status(404).json({ success: false, message: '模板不存在' })

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [project_id])
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' })

    const docCode = await generateDocCode(project_id, template.doc_category)

    let schema: any = null
    if (template.table_schema) {
      try { schema = typeof template.table_schema === 'string' ? JSON.parse(template.table_schema) : template.table_schema }
      catch { schema = null }
    }

    const fieldValues: Record<string, string> = {}
    if (schema?.fields) {
      for (const field of schema.fields) {
        if (field.name === '工程名称' && project.name) fieldValues[field.name] = project.name
        else if (field.name === '监理单位' && project.supervision_unit) fieldValues[field.name] = project.supervision_unit
        else if (field.name === '施工单位' && project.construction_unit) fieldValues[field.name] = project.construction_unit
        else if (field.name === '设计单位' && project.design_unit) fieldValues[field.name] = project.design_unit
        else if (field.name === '业主单位' && project.owner_unit) fieldValues[field.name] = project.owner_unit
        else if (field.name === '编号') fieldValues[field.name] = docCode
      }
    }

    const content = JSON.stringify({
      fieldValues,
      signatureDates: {},
      schema,
      defaultContent: template.default_content || '',
    })

    const id = uuidv4()
    await dbRun(
      `INSERT INTO documents (id, project_id, template_id, doc_code, doc_name, doc_type, doc_category, content, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project_id, template_id, docCode, template.name, template.doc_type, template.doc_category, content, 'draft']
    )
    const doc = await dbGet('SELECT * FROM documents WHERE id = ?', [id])
    res.status(201).json({ success: true, data: doc })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export { router as templateRouter }
