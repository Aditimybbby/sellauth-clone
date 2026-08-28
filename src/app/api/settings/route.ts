import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { getSmtpConfig, sendMail } from '@/lib/email';

// Admin-only: the settings payload includes payment + SMTP configuration.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allSettings = await db.select().from(settings);
    const settingsObj = allSettings.reduce<Record<string, string>>((acc, s) => ({ ...acc, [s.key]: s.value }), {});

    // Never expose the SMTP password — signal that one is stored instead.
    if (settingsObj.smtp_pass) settingsObj.smtp_pass = '__SET__';

    return NextResponse.json(settingsObj);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      // Blank or mask sentinel for the SMTP password means "keep the stored one"
      if (key === 'smtp_pass' && (value === '' || value === '__SET__')) continue;
      const existing = await db.select().from(settings).where(eq(settings.key, key));
      if (existing.length > 0) {
        await db.update(settings).set({ value: String(value), updatedAt: new Date().toISOString() }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value: String(value), updatedAt: new Date().toISOString() });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

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
