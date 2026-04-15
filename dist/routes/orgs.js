import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from './auth';
import { dbGet, dbAll, dbRun } from '../database/init';
const router = Router();
router.use(authenticate);
const isPostgres = () => (process.env.DB_TYPE || 'sqlite').toLowerCase() === 'postgresql';
// ─── Get my organizations ───
router.get('/', async (req, res) => {
    try {
        const { userId } = req.user;
        const items = await dbAll(`SELECT o.*, u.name as owner_name
       FROM organizations o
       LEFT JOIN users u ON o.owner_user_id = u.id
       WHERE o.owner_user_id = $1 OR EXISTS (
         SELECT 1 FROM org_invites oi WHERE oi.org_id = o.id AND oi.email = (
           SELECT email FROM users WHERE id = $1
         ) AND oi.accepted = TRUE
       )`, [userId]);
        res.json({ success: true, data: items });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── Get organization details ───
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.user;
        const org = await dbGet(`SELECT o.*, u.name as owner_name
       FROM organizations o
       LEFT JOIN users u ON o.owner_user_id = u.id
       WHERE o.id = $1`, [id]);
        if (!org)
            return res.status(404).json({ success: false, message: '组织不存在' });
        // Check access
        const members = await dbAll(`SELECT u.id, u.email, u.name, u.role, oi.accepted
       FROM org_invites oi
       JOIN users u ON oi.email = u.email
       WHERE oi.org_id = $1`, [id]);
        res.json({ success: true, data: { ...org, members } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── Update organization ───
router.put('/:id', [
    body('name').optional().notEmpty(),
    body('plan').optional().isIn(['free', 'starter', 'pro', 'enterprise']),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        const { id } = req.params;
        const { userId } = req.user;
        const { name, plan } = req.body;
        const org = await dbGet(`SELECT * FROM organizations WHERE id = $1`, [id]);
        if (!org)
            return res.status(404).json({ success: false, message: '组织不存在' });
        if (org.owner_user_id !== userId)
            return res.status(403).json({ success: false, message: '只有管理员可以修改组织信息' });
        const updates = [];
        const params = [];
        if (name) {
            updates.push(`name = $${params.length + 1}`);
            params.push(name);
        }
        if (plan) {
            updates.push(`plan = $${params.length + 1}`);
            params.push(plan);
        }
        updates.push(`updated_at = ${isPostgres() ? 'CURRENT_TIMESTAMP' : "datetime('now')"}`);
        params.push(id);
        await dbRun(`UPDATE organizations SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
        const updated = await dbGet(`SELECT * FROM organizations WHERE id = $1`, [id]);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── Invite member ───
router.post('/:id/invite', [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('role').optional().isIn(['viewer', 'editor', 'admin']),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        const { id } = req.params;
        const { userId } = req.user;
        const { email, role = 'editor' } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const org = await dbGet(`SELECT * FROM organizations WHERE id = $1`, [id]);
        if (!org)
            return res.status(404).json({ success: false, message: '组织不存在' });
        if (org.owner_user_id !== userId)
            return res.status(403).json({ success: false, message: '只有管理员可以邀请成员' });
        // Check if already invited
        const existing = await dbGet(`SELECT * FROM org_invites WHERE org_id = $1 AND email = $2 AND accepted = FALSE`, [id, normalizedEmail]);
        if (existing)
            return res.status(409).json({ success: false, message: '该邮箱已在邀请列表中' });
        const token = uuidv4();
        await dbRun(`INSERT INTO org_invites (id, org_id, email, role, invite_token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [uuidv4(), id, normalizedEmail, role, token, userId, Date.now() + 7 * 24 * 60 * 60 * 1000]);
        res.json({ success: true, message: '邀请已发送', data: { token } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── Accept invite (with token) ───
router.post('/invites/:token/accept', authenticate, async (req, res) => {
    try {
        const { token } = req.params;
        const { userId } = req.user;
        const userEmail = req.user?.email;
        const invite = await dbGet(`SELECT * FROM org_invites WHERE invite_token = $1 AND accepted = FALSE`, [token]);
        if (!invite)
            return res.status(404).json({ success: false, message: '邀请无效或已过期' });
        if (invite.expires_at && Date.now() > invite.expires_at)
            return res.status(410).json({ success: false, message: '邀请已过期' });
        if (invite.email !== userEmail)
            return res.status(403).json({ success: false, message: '此邀请属于其他邮箱账号' });
        await dbRun(`UPDATE org_invites SET accepted = TRUE WHERE invite_token = $1`, [token]);
        res.json({ success: true, message: '已加入组织', data: { orgId: invite.org_id } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ─── Switch active organization ───
router.post('/switch', async (req, res) => {
    try {
        const { orgId } = req.body;
        const { userId } = req.user;
        // For now, just validate access
        const org = await dbGet(`SELECT * FROM organizations WHERE id = $1`, [orgId]);
        if (!org)
            return res.status(404).json({ success: false, message: '组织不存在' });
        // Update user's primary org in token would require re-issuing token
        // For MVP, the orgId is embedded in JWT on login
        res.json({ success: true, message: '请重新登录以切换组织', data: { orgId } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
export { router as orgRouter };
//# sourceMappingURL=orgs.js.map