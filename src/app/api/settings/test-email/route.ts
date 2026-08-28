import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSmtpConfig } from '@/lib/email';
import nodemailer from 'nodemailer';

// POST = send a test email using the currently saved SMTP configuration.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const to = String(body.to || '').trim();
    if (!to || !to.includes('@')) {
      return NextResponse.json({ ok: false, error: 'A valid recipient email is required' }, { status: 400 });
    }

    const cfg = await getSmtpConfig();
    if (!cfg) {
      return NextResponse.json({
        ok: false,
        error: 'SMTP is not fully configured. Fill host, port, username, password and from address, then save first.',
      });
    }

    const t = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
      tls: { rejectUnauthorized: !cfg.allowInvalidTls },
    });
    const info = await t.sendMail({
      from: cfg.from,
      to,
      subject: 'SellAuth — SMTP test',
      html: '<p>Your SMTP configuration works. Invoice and delivery emails will be sent from this server.</p>',
    });
    // Surface the receiving server's own response so delivery problems are visible
    return NextResponse.json({ ok: true, serverResponse: info.response || '' });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Test email failed' }, { status: 500 });
  }
}
