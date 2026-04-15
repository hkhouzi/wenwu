import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './database/init.js';
import { authRouter } from './routes/auth.js';
import { projectRouter } from './routes/projects.js';
import { documentRouter } from './routes/documents.js';
import { templateRouter } from './routes/templates.js';
import { orgRouter } from './routes/orgs.js';
import { healthRouter } from './routes/health.js';
import { testEmailConfig } from './utils/email.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
// ─── Database init ───
initializeDatabase().then(() => {
    console.log('[Server] Database ready');
    // Test email config on startup
    if (!IS_PROD) {
        testEmailConfig().then(r => {
            if (r.ok)
                console.log('[Email] ' + r.message);
            else
                console.log('[Email] ' + r.message + ' (emails will be logged to console)');
        });
    }
}).catch(err => {
    console.error('[Server] Database initialization failed:', err);
    process.exit(1);
});
// ─── Middleware ───
app.use(helmet({
    contentSecurityPolicy: IS_PROD ? undefined : false,
}));
app.use(cors({
    origin: IS_PROD
        ? ['https://heritagedoc.com', 'https://www.heritagedoc.com']
        : ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
}));
app.use(morgan(IS_PROD ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// ─── Static files ───
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// ─── API Routes ───
app.use('/api/auth', authRouter);
app.use('/api/orgs', orgRouter); // Organization management
app.use('/api/projects', projectRouter);
app.use('/api/documents', documentRouter);
app.use('/api/templates', templateRouter);
app.use('/api', healthRouter); // /api/health, /api/config
// ─── Serve frontend in production ───
if (IS_PROD) {
    const distPath = path.join(__dirname, '../../dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}
// ─── Error handler ───
app.use((err, req, res, next) => {
    console.error('[Error]', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: IS_PROD && err.status !== 500 ? err.message : (err.message || 'Internal Server Error'),
    });
});
// ─── Start server ───
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] HeritageDoc API running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Mode: ${IS_PROD ? 'production' : 'development'}`);
    console.log(`[Server] Database: ${(process.env.DB_TYPE || 'sqlite').toUpperCase()}`);
});
//# sourceMappingURL=index.js.map