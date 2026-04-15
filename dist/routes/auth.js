import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun } from '../database/init';
import { sendEmail, emailCodeCache } from '../utils/email';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'heritagedoc-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';
const VERIFY_CODE_EXPIRES = 10 * 60 * 1000; // 10 minutes
// ─── JWT Middleware ───
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: '未授权，请先登录' });
        }
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ success: false, message: 'Token 无效或已过期，请重新登录' });
    }
};
// ─── Optional auth (doesn't fail if no token) ───
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET);
            req.user = decoded;
        }
    }
    catch { /* ignore */ }
    next();
};
// ─── Send verification code ───
router.post('/send-code', [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + VERIFY_CODE_EXPIRES;
        // Store in memory cache
        emailCodeCache.set(normalizedEmail, { code, expiresAt, type: 'register' });
        // Send email
        const sent = await sendEmail({
            to: normalizedEmail,
            subject: '【HeritageDoc】注册验证码',
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafafa; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0;">HeritageDoc</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">文物保护工程资料管理系统</p>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px;">
            <p style="color: #2d3748; font-size: 15px; margin: 0 0 20px;">您好！</p>
            <p style="color: #2d3748; font-size: 15px; margin: 0 0 24px;">您正在注册 HeritageDoc 账号，您的验证码是：</p>
            <div style="background: #f7fafc; border: 2px dashed #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: bold; color: #1a365d; letter-spacing: 8px;">${code}</span>
            </div>
            <p style="color: #718096; font-size: 13px; margin: 0;">验证码有效期 <strong>10 分钟</strong>，请勿告诉他人。如非本人操作，请忽略此邮件。</p>
          </div>
        </div>
      `,
            text: `您好！您的 HeritageDoc 注册验证码是：${code}，有效期10分钟。`
        });
        if (!sent) {
            return res.status(500).json({ success: false, message: '邮件发送失败，请稍后重试' });
        }
        res.json({ success: true, message: `验证码已发送到 ${normalizedEmail}，请查收` });
    }
    catch (error) {
        console.error('Send code error:', error);
        res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
    }
});
// ─── Register with email + verification code ───
router.post('/register', [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('password').isLength({ min: 8 }).withMessage('密码至少8位'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('验证码为6位数字'),
    body('name').notEmpty().withMessage('请输入您的姓名'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }
        const { email, password, code, name, phone, organization } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        // Verify code
        const cached = emailCodeCache.get(normalizedEmail);
        if (!cached || cached.code !== code || Date.now() > cached.expiresAt) {
            return res.status(400).json({ success: false, message: '验证码错误或已过期，请重新获取' });
        }
        emailCodeCache.delete(normalizedEmail);
        // Check if email already registered
        const existing = await dbGet('SELECT 1 FROM users WHERE email = $1', [normalizedEmail]);
        if (existing) {
            return res.status(409).json({ success: false, message: '该邮箱已注册，请直接登录或找回密码' });
        }
        // Hash password
        const passwordHash = bcrypt.hashSync(password, 12);
        // Determine DB type
        const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
        const isPostgres = dbType === 'postgresql';
        // Create user
        const userId = uuidv4();
        await dbRun(isPostgres
            ? `INSERT INTO users (id, email, password_hash, name, phone, role, status, email_verified)
           VALUES ($1, $2, $3, $4, $5, 'user', 'active', TRUE)`
            : `INSERT INTO users (id, email, password_hash, name, phone, role, status, email_verified)
           VALUES (?, ?, ?, ?, ?, 'user', 'active', 1)`, [userId, normalizedEmail, passwordHash, name.trim(), phone || null]);
        // Auto-create personal organization
        const orgId = uuidv4();
        const orgName = organization?.trim() || `${name} 的团队`;
        await dbRun(isPostgres
            ? `INSERT INTO organizations (id, name, owner_user_id) VALUES ($1, $2, $3)`
            : `INSERT INTO organizations (id, name, owner_user_id) VALUES (?, ?, ?)`, [orgId, orgName, userId]);
        // Generate JWT
        const token = jwt.sign({ userId, email: normalizedEmail, name, role: 'user', orgId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({
            success: true,
            message: '注册成功！欢迎使用 HeritageDoc',
            data: {
                token,
                user: { id: userId, email: normalizedEmail, name, role: 'user', organization: orgName },
                organization: { id: orgId, name: orgName, plan: 'free' }
            }
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: '注册失败，请稍后重试' });
    }
});
// ─── Login with email + password ───
router.post('/login', [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('password').notEmpty().withMessage('请输入密码'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
        const isPostgres = dbType === 'postgresql';
        const user = await dbGet(isPostgres
            ? `SELECT id, email, password_hash, name, phone, role, status, email_verified
           FROM users WHERE email = $1`
            : `SELECT id, email, password_hash, name, phone, role, status, email_verified
           FROM users WHERE email = ?`, [normalizedEmail]);
        if (!user) {
            return res.status(401).json({ success: false, message: '邮箱或密码错误' });
        }
        if (user.status === 'disabled') {
            return res.status(403).json({ success: false, message: '账号已被禁用，请联系管理员' });
        }
        if (!bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ success: false, message: '邮箱或密码错误' });
        }
        // Get user's primary organization
        const org = await dbGet(isPostgres
            ? `SELECT o.id, o.name, o.plan, o.max_projects, o.max_storage_mb
           FROM organizations o WHERE o.owner_user_id = $1 LIMIT 1`
            : `SELECT id, name, plan, max_projects, max_storage_mb
           FROM organizations WHERE owner_user_id = ? LIMIT 1`, [user.id]);
        // Update last login
        await dbRun(isPostgres
            ? `UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`
            : `UPDATE users SET updated_at = datetime('now') WHERE id = ?`, [user.id]);
        const token = jwt.sign({
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            orgId: org?.id || null
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({
            success: true,
            message: '登录成功',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                },
                organization: org || null
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
    }
});
// ─── Get current user ───
router.get('/me', authenticate, async (req, res) => {
    try {
        const { userId, orgId } = req.user;
        const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
        const isPostgres = dbType === 'postgresql';
        const user = await dbGet(isPostgres
            ? `SELECT id, email, name, phone, role, status, email_verified, created_at
           FROM users WHERE id = $1`
            : `SELECT id, email, name, phone, role, status, email_verified, created_at
           FROM users WHERE id = ?`, [userId]);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        const org = orgId ? await dbGet(isPostgres
            ? `SELECT id, name, plan, max_projects, max_storage_mb FROM organizations WHERE id = $1`
            : `SELECT id, name, plan, max_projects, max_storage_mb FROM organizations WHERE id = ?`, [orgId]) : null;
        res.json({ success: true, data: { user, organization: org } });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: '获取用户信息失败' });
    }
});
// ─── Send password reset code ───
router.post('/send-reset-code', [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
        const isPostgres = dbType === 'postgresql';
        const user = await dbGet(isPostgres
            ? `SELECT id, name FROM users WHERE email = $1`
            : `SELECT id, name FROM users WHERE email = ?`, [normalizedEmail]);
        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ success: true, message: '如果该邮箱已注册，验证码已发送' });
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + VERIFY_CODE_EXPIRES;
        emailCodeCache.set(normalizedEmail, { code, expiresAt, type: 'reset' });
        await sendEmail({
            to: normalizedEmail,
            subject: '【HeritageDoc】密码重置验证码',
            html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafafa; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #742a2a 0%, #9b2c2c 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0;">HeritageDoc</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">密码重置验证码</p>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px;">
            <p style="color: #2d3748; font-size: 15px;">您好 ${user.name || ''}！</p>
            <p style="color: #2d3748; font-size: 15px; margin: 16px 0 24px;">您正在重置密码，验证码是：</p>
            <div style="background: #fff5f5; border: 2px dashed #feb2b2; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: bold; color: #9b2c2c; letter-spacing: 8px;">${code}</span>
            </div>
            <p style="color: #718096; font-size: 13px;">验证码有效期 <strong>10 分钟</strong>。如非本人操作，请忽略此邮件。</p>
          </div>
        </div>
      `,
            text: `您的 HeritageDoc 密码重置验证码是：${code}，有效期10分钟。`
        });
        res.json({ success: true, message: `验证码已发送到 ${normalizedEmail}，请查收` });
    }
    catch (error) {
        console.error('Send reset code error:', error);
        res.json({ success: true, message: '如果该邮箱已注册，验证码已发送' });
    }
});
// ─── Reset password with code ───
router.post('/reset-password', [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('验证码为6位数字'),
    body('newPassword').isLength({ min: 8 }).withMessage('新密码至少8位'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }
        const { email, code, newPassword } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
        const isPostgres = dbType === 'postgresql';
        const cached = emailCodeCache.get(normalizedEmail);
        if (!cached || cached.code !== code || Date.now() > cached.expiresAt || cached.type !== 'reset') {
            return res.status(400).json({ success: false, message: '验证码错误或已过期，请重新获取' });
        }
        emailCodeCache.delete(normalizedEmail);
        const user = await dbGet(isPostgres
            ? `SELECT id FROM users WHERE email = $1`
            : `SELECT id FROM users WHERE email = ?`, [normalizedEmail]);
        if (!user) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }
        const passwordHash = bcrypt.hashSync(newPassword, 12);
        await dbRun(isPostgres
            ? `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
            : `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [passwordHash, user.id]);
        res.json({ success: true, message: '密码重置成功，请使用新密码登录' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: '密码重置失败，请稍后重试' });
    }
});
// ─── Change password (authenticated) ───
router.post('/change-password', authenticate, [
    body('oldPassword').notEmpty().withMessage('请输入原密码'),
    body('newPassword').isLength({ min: 8 }).withMessage('新密码至少8位'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }
        const { oldPassword, newPassword } = req.body;
        const { userId } = req.user;
        const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
        const isPostgres = dbType === 'postgresql';
        const user = await dbGet(isPostgres
            ? `SELECT id, password_hash FROM users WHERE id = $1`
            : `SELECT id, password_hash FROM users WHERE id = ?`, [userId]);
        if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
            return res.status(401).json({ success: false, message: '原密码错误' });
        }
        const passwordHash = bcrypt.hashSync(newPassword, 12);
        await dbRun(isPostgres
            ? `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
            : `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [passwordHash, userId]);
        res.json({ success: true, message: '密码修改成功' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: '密码修改失败' });
    }
});
// ─── Update profile ───
router.put('/profile', authenticate, [
    body('name').optional().notEmpty().withMessage('姓名不能为空'),
    body('phone').optional(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }
        const { name, phone } = req.body;
        const { userId } = req.user;
        const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();
        const isPostgres = dbType === 'postgresql';
        const updates = [];
        const params = [];
        let idx = 1;
        if (name !== undefined) {
            updates.push(isPostgres ? `name = $${idx++}` : `name = ?`);
            params.push(name.trim());
        }
        if (phone !== undefined) {
            updates.push(isPostgres ? `phone = $${idx++}` : `phone = ?`);
            params.push(phone);
        }
        updates.push(isPostgres ? `updated_at = CURRENT_TIMESTAMP` : `updated_at = datetime('now')`);
        params.push(userId);
        await dbRun(isPostgres
            ? `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`
            : `UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        res.json({ success: true, message: '个人信息已更新' });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: '更新失败' });
    }
});
// ─── Logout ───
router.post('/logout', authenticate, (req, res) => {
    res.json({ success: true, message: '已退出登录' });
});
export { router as authRouter };
//# sourceMappingURL=auth.js.map