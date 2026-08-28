import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSmtpConfig, sendMail } from '@/lib/email';

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

    const ok = await sendMail(to, 'SellAuth — SMTP test', '<p>Your SMTP configuration works. Invoice and delivery emails will be sent from this server.</p>');
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Sending failed — check the SMTP host/port/credentials and server logs.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Test email failed' }, { status: 500 });
  }
}
