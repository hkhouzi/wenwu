import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import { dbGet, dbRun } from '../database/init'
import { sendEmail, emailCodeCache } from '../utils/email'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'heritagedoc-jwt-secret-change-in-production'
const JWT_EXPIRES_IN = '7d'
const VERIFY_CODE_EXPIRES = 10 * 60 * 1000

const isPostgres = () => (process.env.DB_TYPE || 'sqlite').toLowerCase() === 'postgresql'

// ─── Middleware ───
export const authenticate = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未授权，请先登录' })
    }
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as any
    ;(req as any).user = decoded
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Token 无效或已过期，请重新登录' })
  }
}

export const optionalAuth = async (req: Request, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any
      ;(req as any).user = decoded
    }
  } catch { /* ignore */ }
  next()
}

// ─── Send verification code ───
router.post('/send-code', [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg })
    const { email } = req.body
    const normalizedEmail = email.toLowerCase().trim()
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + VERIFY_CODE_EXPIRES
    emailCodeCache.set(normalizedEmail, { code, expiresAt, type: 'register' })
    const sent = await sendEmail({
      to: normalizedEmail,
      subject: '【HeritageDoc】注册验证码',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fafafa;border-radius:12px;">
        <div style="background:linear-gradient(135deg,#1a365d,#2c5282);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;font-size:24px;margin:0;">HeritageDoc</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">文物保护工程资料管理系统</p>
        </div>
        <div style="background:white;padding:32px;border-radius:0 0 12px 12px;">
          <p style="color:#2d3748;font-size:15px;margin:0 0 20px;">您好！</p>
          <p style="color:#2d3748;font-size:15px;margin:0 0 24px;">您正在注册 HeritageDoc 账号，您的验证码是：</p>
          <div style="background:#f7fafc;border:2px dashed #e2e8f0;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:bold;color:#1a365d;letter-spacing:8px;">${code}</span>
          </div>
          <p style="color:#718096;font-size:13px;margin:0;">验证码有效期 <strong>10 分钟</strong>，请勿告诉他人。</p>
        </div>
      </div>`,
      text: `您好！您的 HeritageDoc 注册验证码是：${code}，有效期10分钟。`
    })
    if (!sent) return res.status(500).json({ success: false, message: '邮件发送失败，请稍后重试' })
    res.json({ success: true, message: `验证码已发送到 ${normalizedEmail}，请查收` })
  } catch (error: any) {
    console.error('Send code error:', error)
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' })
  }
})

// ─── Register ───
router.post('/register', [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').isLength({ min: 8 }).withMessage('密码至少8位'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('验证码为6位数字'),
  body('name').notEmpty().withMessage('请输入您的姓名'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg })
    const { email, password, code, name, phone, organization } = req.body
    const normalizedEmail = email.toLowerCase().trim()
    const cached = emailCodeCache.get(normalizedEmail)
    if (!cached || cached.code !== code || Date.now() > cached.expiresAt) {
      return res.status(400).json({ success: false, message: '验证码错误或已过期，请重新获取' })
    }
    emailCodeCache.delete(normalizedEmail)
    const existing = await dbGet(
      `SELECT 1 FROM users WHERE email = ? OR username = ?`, [normalizedEmail, normalizedEmail]
    )
    if (existing) return res.status(409).json({ success: false, message: '该邮箱已注册，请直接登录或找回密码' })
    const passwordHash = bcrypt.hashSync(password, 12)
    const userId = uuidv4()
    await dbRun(
      `INSERT INTO users (id, username, email, password_hash, name, phone, role, status, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, 'user', 'active', 1)`,
      [userId, normalizedEmail, normalizedEmail, passwordHash, name.trim(), phone || null]
    )
    const orgId = uuidv4()
    const orgName = organization?.trim() || `${name} 的团队`
    await dbRun(
      `INSERT INTO organizations (id, name, owner_user_id) VALUES (?, ?, ?)`,
      [orgId, orgName, userId]
    )
    const token = jwt.sign(
      { userId, email: normalizedEmail, name, role: 'user', orgId },
      JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    )
    res.status(201).json({
      success: true, message: '注册成功！欢迎使用 HeritageDoc',
      data: {
        token, user: { id: userId, email: normalizedEmail, name, role: 'user', organization: orgName },
        organization: { id: orgId, name: orgName, plan: 'free' }
      }
    })
  } catch (error: any) {
    console.error('Register error:', error)
    res.status(500).json({ success: false, message: '注册失败，请稍后重试' })
  }
})

// ─── Login ───
router.post('/login', [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').notEmpty().withMessage('请输入密码'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg })
    const { email, password } = req.body
    const normalizedEmail = email.toLowerCase().trim()
    const user = await dbGet(
      `SELECT * FROM users WHERE email = ? OR username = ?`, [normalizedEmail, normalizedEmail]
    )
    if (!user) return res.status(401).json({ success: false, message: '邮箱或密码错误' })
    if (user.status === 'disabled') return res.status(403).json({ success: false, message: '账号已被禁用，请联系管理员' })
    const hashToCheck = user.password_hash || user.password
    if (!hashToCheck || !bcrypt.compareSync(password, hashToCheck)) {
      return res.status(401).json({ success: false, message: '邮箱或密码错误' })
    }
    const org = await dbGet(
      `SELECT * FROM organizations WHERE owner_user_id = ? LIMIT 1`, [user.id]
    )
    await dbRun(`UPDATE users SET updated_at = datetime('now') WHERE id = ?`, [user.id])
    const token = jwt.sign(
      { userId: user.id, email: user.email || user.username, name: user.name, role: user.role, orgId: org?.id || null },
      JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
    )
    res.json({
      success: true, message: '登录成功',
      data: {
        token,
        user: { id: user.id, email: user.email || user.username, name: user.name, phone: user.phone, role: user.role },
        organization: org || null
      }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' })
  }
})

// ─── Get current user ───
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId, orgId } = (req as any).user
    const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId])
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' })
    const org = orgId ? await dbGet(`SELECT * FROM organizations WHERE id = ?`, [orgId]) : null
    res.json({ success: true, data: { user, organization: org } })
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取用户信息失败' })
  }
})

// ─── Send password reset code ───
router.post('/send-reset-code', [body('email').isEmail()], async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    const normalizedEmail = email.toLowerCase().trim()
    const user = await dbGet(`SELECT id, name FROM users WHERE email = ? OR username = ?`, [normalizedEmail, normalizedEmail])
    if (!user) return res.json({ success: true, message: '如果该邮箱已注册，验证码已发送' })
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    emailCodeCache.set(normalizedEmail, { code, expiresAt: Date.now() + VERIFY_CODE_EXPIRES, type: 'reset' })
    await sendEmail({
      to: normalizedEmail, subject: '【HeritageDoc】密码重置验证码',
      html: `<p>您好！您的 HeritageDoc 密码重置验证码是：<b style="font-size:24px">${code}</b>，有效期10分钟。</p>`,
      text: `您的 HeritageDoc 密码重置验证码是：${code}，有效期10分钟。`
    })
    res.json({ success: true, message: `验证码已发送到 ${normalizedEmail}，请查收` })
  } catch { res.json({ success: true, message: '如果该邮箱已注册，验证码已发送' }) }
})

// ─── Reset password ───
router.post('/reset-password', [
  body('email').isEmail(), body('code').isLength({ min: 6, max: 6 }), body('newPassword').isLength({ min: 8 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg })
    const { email, code, newPassword } = req.body
    const normalizedEmail = email.toLowerCase().trim()
    const cached = emailCodeCache.get(normalizedEmail)
    if (!cached || cached.code !== code || Date.now() > cached.expiresAt || cached.type !== 'reset') {
      return res.status(400).json({ success: false, message: '验证码错误或已过期，请重新获取' })
    }
    emailCodeCache.delete(normalizedEmail)
    const user = await dbGet(`SELECT id FROM users WHERE email = ? OR username = ?`, [normalizedEmail, normalizedEmail])
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' })
    const passwordHash = bcrypt.hashSync(newPassword, 12)
    await dbRun(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [passwordHash, user.id])
    res.json({ success: true, message: '密码重置成功，请使用新密码登录' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: '密码重置失败，请稍后重试' })
  }
})

// ─── Change password (authenticated) ───
router.post('/change-password', authenticate, [
  body('oldPassword').notEmpty(), body('newPassword').isLength({ min: 8 }),
], async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body
    const { userId } = (req as any).user
    const user = await dbGet(`SELECT id, password_hash, password FROM users WHERE id = ?`, [userId])
    const hashToCheck = user.password_hash || user.password
    if (!hashToCheck || !bcrypt.compareSync(oldPassword, hashToCheck)) {
      return res.status(401).json({ success: false, message: '原密码错误' })
    }
    const passwordHash = bcrypt.hashSync(newPassword, 12)
    await dbRun(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [passwordHash, userId])
    res.json({ success: true, message: '密码修改成功' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: '密码修改失败' })
  }
})

// ─── Update profile ───
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body
    const { userId } = (req as any).user
    const updates: string[] = []
    const params: any[] = []
    if (name) { updates.push('name = ?'); params.push(name.trim()) }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone) }
    updates.push("updated_at = datetime('now')")
    params.push(userId)
    await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)
    res.json({ success: true, message: '个人信息已更新' })
  } catch (error: any) {
    res.status(500).json({ success: false, message: '更新失败' })
  }
})

router.post('/logout', authenticate, (_req: Request, res: Response) => {
  res.json({ success: true, message: '已退出登录' })
})

export { router as authRouter }
