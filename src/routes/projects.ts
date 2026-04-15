import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { body, validationResult } from 'express-validator'
import { authenticate } from './auth'
import { dbGet, dbAll, dbRun } from '../database/init'

const router = Router()

// All routes require authentication
router.use(authenticate)

// ─── Helpers ───
const getOrgId = (req: Request) => (req as any).user?.orgId
const isPostgres = () => (process.env.DB_TYPE || 'sqlite').toLowerCase() === 'postgresql'
const param = (params: any[], val: any) => { params.push(val); return isPostgres() ? `$${params.length}` : '?' }
const now = () => isPostgres() ? 'CURRENT_TIMESTAMP' : "datetime('now')"

// ─── List projects ───
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req)
    if (!orgId) return res.status(403).json({ success: false, message: '未加入任何组织' })

    const { name, heritage_type, status, page = 1, size = 20 } = req.query
    const params: any[] = [orgId]
    let where = isPostgres() ? 'WHERE org_id = $1' : 'WHERE org_id = ?'

    if (name) { where += ` AND name LIKE ${param(params, `%${name}%`)}` }
    if (heritage_type) { where += ` AND heritage_type = ${param(params, heritage_type)}` }
    if (status) { where += ` AND status = ${param(params, status)}` }

    const totalRow = await dbGet(
      `SELECT COUNT(*) as cnt FROM projects ${where}`,
      params
    )
    const total = totalRow?.cnt || 0
    const offset = (Number(page) - 1) * Number(size)

    const items = await dbAll(
      `SELECT * FROM projects ${where} ORDER BY created_at DESC LIMIT ${param(params, Number(size))} OFFSET ${param(params, offset)}`,
      params
    )

    res.json({ success: true, data: { items, total, page: Number(page), size: Number(size) } })
  } catch (error: any) {
    console.error('List projects error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Get project ───
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req)
    const { id } = req.params
    const p = isPostgres() ? [id, orgId] : [id, orgId]

    const project = await dbGet(
      `SELECT * FROM projects WHERE id = ${param(p, id)} AND org_id = ${param(p, orgId)}`,
      p
    )
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' })

    // Stats
    const stats = await dbGet(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
       FROM documents WHERE project_id = ${param([], id)}`,
      [id]
    )

    res.json({ success: true, data: { ...project, docStats: stats } })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Create project ───
router.post('/', [
  body('name').notEmpty().withMessage('项目名称不能为空'),
  body('project_code').notEmpty().withMessage('项目编号不能为空'),
  body('heritage_type').notEmpty().withMessage('文物类型不能为空'),
  body('heritage_level').notEmpty().withMessage('保护级别不能为空'),
  body('location').notEmpty().withMessage('项目地点不能为空'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg })
    }

    const orgId = getOrgId(req)
    if (!orgId) return res.status(403).json({ success: false, message: '未加入任何组织' })

    const {
      name, project_code, heritage_type, heritage_level, location,
      owner_unit, construction_unit, supervision_unit, design_unit,
      start_date, end_date, status, description
    } = req.body

    // Check uniqueness within org
    const exists = await dbGet(
      `SELECT 1 FROM projects WHERE org_id = ${param([], orgId)} AND project_code = ${param([], project_code)}`,
      [orgId, project_code]
    )
    if (exists) return res.status(409).json({ success: false, message: '该项目编号已存在' })

    const id = uuidv4()
    const fields = 'id, org_id, project_code, name, heritage_type, heritage_level, location, owner_unit, construction_unit, supervision_unit, design_unit, start_date, end_date, status, description'
    const placeholders = isPostgres()
      ? '$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15'
      : '?,?,?,?,?,?,?,?,?,?,?,?,?,?,?'
    const vals = [id, orgId, project_code, name, heritage_type, heritage_level, location, owner_unit || null, construction_unit || null, supervision_unit || null, design_unit || null, start_date || null, end_date || null, status || 'active', description || null]

    await dbRun(
      `INSERT INTO projects (${fields}) VALUES (${placeholders})`,
      vals
    )

    const project = await dbGet(`SELECT * FROM projects WHERE id = ${param([], id)}`, [id])
    res.status(201).json({ success: true, data: project })
  } catch (error: any) {
    console.error('Create project error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Update project ───
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req)
    const { id } = req.params
    const p: any[] = []

    const project = await dbGet(
      `SELECT * FROM projects WHERE id = ${param(p, id)} AND org_id = ${param(p, orgId)}`,
      [id, orgId]
    )
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' })

    const {
      name, project_code, heritage_type, heritage_level, location,
      owner_unit, construction_unit, supervision_unit, design_unit,
      start_date, end_date, status, description
    } = req.body

    await dbRun(
      `UPDATE projects SET
        name=${param(p, name)}, project_code=${param(p, project_code)}, heritage_type=${param(p, heritage_type)},
        heritage_level=${param(p, heritage_level)}, location=${param(p, location)},
        owner_unit=${param(p, owner_unit)}, construction_unit=${param(p, construction_unit)},
        supervision_unit=${param(p, supervision_unit)}, design_unit=${param(p, design_unit)},
        start_date=${param(p, start_date)}, end_date=${param(p, end_date)},
        status=${param(p, status)}, description=${param(p, description)}, updated_at=${now()}
       WHERE id = ${param(p, id)}`,
      p
    )

    const updated = await dbGet(`SELECT * FROM projects WHERE id = ${param([], id)}`, [id])
    res.json({ success: true, data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Delete project ───
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req)
    const { id } = req.params

    const project = await dbGet(
      `SELECT * FROM projects WHERE id = ? AND org_id = ?`,
      [id, orgId]
    )
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' })

    await dbRun(`DELETE FROM projects WHERE id = ? AND org_id = ?`, [id, orgId])
    res.json({ success: true, message: '项目已删除' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ─── Project stats ───
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req)
    const { id } = req.params

    const project = await dbGet(`SELECT * FROM projects WHERE id = ? AND org_id = ?`, [id, orgId])
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' })

    const stats = await dbGet(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN doc_category IS NOT NULL THEN 1 ELSE 0 END) as categorized
       FROM documents WHERE project_id = ?`,
      [id]
    )

    res.json({ success: true, data: stats })
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export { router as projectRouter }
