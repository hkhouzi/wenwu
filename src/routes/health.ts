import { Router } from 'express'
import { testEmailConfig } from '../utils/email'

const router = Router()

// ─── Health check ───
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HeritageDoc API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    database: process.env.DB_TYPE || 'sqlite',
    mode: process.env.NODE_ENV || 'development',
  })
})

// ─── Public config ───
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '2.0.0',
      features: {
        emailAuth: true,
        multiTenant: true,
        cloudStorage: false,  // Phase 2
        offlineSync: false,  // Phase 5
        versionHistory: false, // Phase 6
      },
      plans: {
        free: { maxProjects: 3, maxStorageMb: 1024 },
        starter: { maxProjects: 10, maxStorageMb: 10240 },
        pro: { maxProjects: 50, maxStorageMb: 102400 },
        enterprise: { maxProjects: -1, maxStorageMb: -1 },
      },
      heritageTypes: ['古建筑', '石窟寺', '壁画', '遗址', '陵墓', '近现代建筑', '其他'],
      heritageLevels: [
        '全国重点文物保护单位',
        '省级文物保护单位',
        '市级文物保护单位',
        '县级文物保护单位',
        '尚未核定保护级别',
      ],
    }
  })
})

// ─── Email config test ───
router.get('/email/test', async (req, res) => {
  const result = await testEmailConfig()
  res.json({ success: result.ok, message: result.message })
})

export { router as healthRouter }
