import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

// ─── In-memory code cache ───
// In production, use Redis. This works for single-instance deployments.
export const emailCodeCache = new Map<string, { code: string; expiresAt: number; type: 'register' | 'reset' }>()

// Cleanup expired codes every 15 minutes
setInterval(() => {
  const now = Date.now()
  for (const [email, data] of emailCodeCache.entries()) {
    if (now > data.expiresAt) emailCodeCache.delete(email)
  }
}, 15 * 60 * 1000)

// ─── Resend (recommended - zero config) ───
async function sendWithResend(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not set, skipping email')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: [to],
        subject,
        html,
        text,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Email] Resend error:', err)
      return false
    }

    console.log(`[Email] Sent via Resend to ${to}`)
    return true
  } catch (e) {
    console.error('[Email] Resend fetch error:', e)
    return false
  }
}

// ─── SMTP (traditional) ───
async function sendWithSMTP(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    })
    console.log(`[Email] Sent via SMTP to ${to}`)
    return true
  } catch (e) {
    console.error('[Email] SMTP error:', e)
    return false
  }
}

// ─── Main send function ───
export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<boolean> {
  const { to, subject, html, text } = opts

  // Prefer Resend if API key is set
  if (process.env.RESEND_API_KEY) {
    return sendWithResend(to, subject, html, text)
  }

  // Fall back to SMTP
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return sendWithSMTP(to, subject, html, text)
  }

  // Dev mode: log to console
  console.log(`[Email] DEV MODE - would send to ${to}:`)
  console.log(`  Subject: ${subject}`)
  console.log(`  Body: ${text.substring(0, 100)}...`)
  return true
}

// ─── Test email configuration ───
export async function testEmailConfig(): Promise<{ ok: boolean; message: string }> {
  if (process.env.RESEND_API_KEY) {
    return { ok: true, message: 'Using Resend API' }
  }
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
      await transporter.verify()
      return { ok: true, message: 'SMTP connection OK' }
    } catch (e: any) {
      return { ok: false, message: `SMTP error: ${e.message}` }
    }
  }
  return { ok: false, message: 'No email provider configured (set RESEND_API_KEY or SMTP_* vars)' }
}
