/**
 * 文物保护工程资料管理系统 - 后端服务
 * 主入口文件
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase } = require('./models/database');

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/templates', express.static(path.join(__dirname, '../templates')));

// API 路由
app.use('/api/projects', require('./routes/projects'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/workflow', require('./routes/workflow'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '文物保护工程资料管理系统运行中',
    timestamp: new Date().toISOString()
  });
});

// 根路由
app.get('/api', (req, res) => {
  res.json({
    name: '文物保护工程资料管理系统 API',
    version: '1.0.0',
    endpoints: {
      projects: '/api/projects',
      documents: '/api/documents',
      templates: '/api/templates',
      workflow: '/api/workflow'
    }
  });
});

// 前端静态文件（生产模式）
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: '服务器内部错误', 
    message: err.message 
  });
});

// 启动服务
const startServer = async () => {
  try {
    // 初始化数据库
    initDatabase();
    
    // 确保上传目录存在
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    app.listen(PORT, () => {
      console.log('========================================');
      console.log('  文物保护工程资料管理系统');
      console.log('========================================');
      console.log(`  API 服务: http://localhost:${PORT}/api`);
      console.log(`  健康检查: http://localhost:${PORT}/api/health`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
};

startServer();
