# Environment Setup Guide (step by step)

Every setting this app reads from `.env`, what it does, and exactly what to put in it.
Copy-paste template is at the bottom.

---

## 1. What is "NextAuth"?

NextAuth is the login library your **admin panel** uses. When you sign in at
`/admin/login`, NextAuth checks your email + password against `ADMIN_EMAIL` /
`ADMIN_PASSWORD` and issues a signed session cookie. To sign cookies it needs
one thing: **`NEXTAUTH_SECRET`**, which is just a long random string. It is not
a value you get from anywhere — you make it up (randomly).

There is nothing else to configure for admin login. If `.env` has a random
secret and your admin email/password, admin login works.

---

## 2. Generate your NEXTAUTH_SECRET

Pick **one** of these commands and paste the output into `.env`:

PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

or plain PowerShell without Node:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Output looks like: `xK3mP9...=` — that whole string is your secret.

---

## 3. The variables this app actually reads

| Variable | Used by | What to put |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | download links, BlockCypher callbacks | The public URL of your store. Locally: `http://localhost:3000`. Deployed: your real domain (must be reachable from the internet for webhooks). |
| `ADMIN_EMAIL` | admin login | The email you want to log into `/admin` with. |
| `ADMIN_PASSWORD` | admin login | A strong password. **Never** keep `admin123`. |
| `NEXTAUTH_SECRET` | signs admin session cookies | A long random string (see step 2). |
| `NEXTAUTH_URL` | NextAuth library (read automatically) | Same as your store URL, e.g. `http://localhost:3000`. |
| `BLOCKCYPHER_TOKEN` | crypto payment forwarding + payment detection | Your API token from blockcypher.com. **Free tier rate-limits hard (~100 req/hr)** — if you see HTTP 429 in your logs, this is why. |
| `CRYPTO_DESTINATION_ADDRESS` | fallback payment address | Your real wallet address that should receive payments. Used only when no per-coin address is set in **Admin → Settings → Payments** (preferred). Must be a REAL address on the matching chain. |
| `CRYPTO_WEBHOOK_SECRET` | secures BlockCypher callbacks | Any long random string. **Required** for crypto payments — without it all webhooks are rejected. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | invoice + delivery emails | Your email provider's SMTP details (see section 5). Without these, emails are skipped and the store works normally. |

Notes:
- `APP_SECRET` and `BLOCKCYPHER_COIN` in your current `.env` are **not used by
  the code** — you can delete those two lines.
- Store name, announcement, per-coin wallet addresses (`btc_address`,
  `ltc_address`) etc. are **not** env vars — you set them in
  **Admin → Settings** and they're stored in the database.

---

## 4. How crypto payments are detected (important to understand)

1. When `BLOCKCYPHER_TOKEN` + a real destination address are configured, every
   invoice gets its own **BlockCypher forwarding address**. BlockCypher watches
   it and calls our webhook when payment arrives → order fulfils automatically.
2. If forwarding creation fails (e.g. BlockCypher 429 rate limit), the invoice
   uses the static address and the app **polls the blockchain** while the
   invoice page is open (at most once per 45s per invoice). Payments received
   after the invoice was created are detected and fulfil the order.
3. This means you can even use **your own wallet address** as the destination —
   payments sent to it after an invoice exists are detected by the polling.
   Old invoices created before the polling feature exist cannot be detected.
4. Never send money to an address that starts with `your-` — that's a
   placeholder and the store refuses to create crypto invoices until a real
   address is configured.

---

## 5. Email delivery of invoices and keys

> **New:** SMTP can also be configured in the website itself — Admin → Settings → Email (SMTP).
> Values entered there are stored in the database and take priority over the environment
> variables below. A "Send test email" button verifies the setup.


> **New:** SMTP can also be configured in the website itself — Admin → Settings → Email (SMTP).
> Values entered there are stored in the database and take priority over the environment
> variables below. A "Send test email" button verifies the setup.


The store emails customers twice: when an invoice is created (payment
instructions) and when payment is confirmed (the license keys / download
links). Emails are sent only when SMTP is configured; otherwise the store
skips them silently.

Easiest options:

**Gmail (free):**
1. Enable 2-Step Verification on your Google account.
2. Create an App Password: myaccount.google.com → Security → App passwords.
3. Use:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your@gmail.com
   SMTP_PASS=your-16-char-app-password
   EMAIL_FROM=your@gmail.com
   ```

**Resend (free tier, great for products):**
1. Create an account at resend.com, verify your domain (or use their test sender).
2. Use:
   ```env
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_USER=resend
   SMTP_PASS=your-resend-api-key
   EMAIL_FROM=store@yourdomain.com
   ```

After adding the variables in Railway, the service redeploys automatically and
emails go out from then on.

---

## 6. Minimal working `.env` (copy, fill in, save)

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin login (CHANGE BOTH!)
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=change…rong

# NextAuth
NEXTAUTH_SECRET=paste-…here
NEXTAUTH_URL=http://localhost:3000

# BlockCypher (crypto payments)
BLOCKCYPHER_TOKEN=your-t…pher
CRYPTO_DESTINATION_ADDRESS=your-real-wallet-address
CRYPTO_WEBHOOK_SECRET=anothe…ring

# Emails (optional but recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your@gmail.com
```

After saving, restart the dev server (`Ctrl+C`, then `npm run dev`) — env
changes are only read at startup.

---

## 7. Check it works

1. Admin: open `http://localhost:3000/admin` → log in with your new email/password.
2. Crypto invoice: buy something with "Bitcoin" → the invoice page shows a
   wallet address. Pay attention: if BlockCypher is rate-limited the invoice
   shows your static address instead of a forwarding address.
3. Real webhook payments only fire when the app is deployed on a **public**
   URL. Locally, use the "Test Pay" button (mock payment) to exercise the flow.

---

## 8. Discord login (optional, for customers)

The customer login page has a Discord button that's currently a placeholder.
To make it real you need a Discord OAuth app:

1. Go to <https://discord.com/developers/applications> → **New Application** → give it a name.
2. Open **OAuth2** in the left menu → copy the **Client ID**.
3. Click **Reset Secret** → copy the **Client Secret**.
4. Under **Redirects**, add: `http://localhost:3000/api/auth/callback/discord`
   (and your production URL later, e.g. `https://yourstore.com/api/auth/callback/discord`).
5. Add to `.env`:
   ```env
   DISCORD_CLIENT_ID=paste-client-id
   DISCORD_CLIENT_SECRET=paste-…cret
   ```

The code side (wiring the Discord provider into the customer login flow) still
needs to be implemented — the values above are everything it will need.

---

## 9. Rotate leaked secrets (important)

These were exposed publicly in git history on Aug 28, 2026, so replace them:

- [ ] BlockCypher token → regenerate at blockcypher.com, update `.env`
- [ ] `ADMIN_PASSWORD` → pick a new one in `.env`
- [ ] `NEXTAUTH_SECRET` → generate a new one (step 2)
- [ ] `CRYPTO_WEBHOOK_SECRET` → generate a new one (not leaked, but set it if missing)
