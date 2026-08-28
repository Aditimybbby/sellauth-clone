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
| `BLOCKCYPHER_TOKEN` | crypto payment forwarding | Your API token from blockcypher.com (Account → Settings → API Tokens). |
| `CRYPTO_DESTINATION_ADDRESS` | fallback payment address | Your real wallet address that should receive payments. Used only when no per-coin address is set in **Admin → Settings → Payments** (preferred). |
| `CRYPTO_WEBHOOK_SECRET` | secures BlockCypher callbacks | Any long random string (same way as NEXTAUTH_SECRET). BlockCypher will send it back with every webhook. **Required** for crypto payments — without it all webhooks are rejected. |

Notes:
- `APP_SECRET` and `BLOCKCYPHER_COIN` in your current `.env` are **not used by
  the code** — you can delete those two lines.
- Store name, announcement, per-coin wallet addresses (`btc_address`,
  `ltc_address`) etc. are **not** env vars — you set them in
  **Admin → Settings** and they're stored in the database.

---

## 4. Minimal working `.env` (copy, fill in, save)

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin login (CHANGE BOTH!)
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=change-me-to-something-strong

# NextAuth
NEXTAUTH_SECRET=paste-generated-random-string-here
NEXTAUTH_URL=http://localhost:3000

# BlockCypher (crypto payments)
BLOCKCYPHER_TOKEN=your-token-from-blockcypher
CRYPTO_DESTINATION_ADDRESS=your-real-wallet-address
CRYPTO_WEBHOOK_SECRET=another-random-string
```

After saving, restart the dev server (`Ctrl+C`, then `npm run dev`) — env
changes are only read at startup.

---

## 5. Check it works

1. Admin: open `http://localhost:3000/admin` → log in with your new email/password.
2. Crypto invoice: buy something with "Bitcoin" → the invoice page shows a
   wallet address. If `BLOCKCYPHER_TOKEN` + a real destination address are set,
   that address is a fresh BlockCypher forwarding address; otherwise it's your
   static one.
3. Real webhook payments only fire when the app is deployed on a **public**
   URL. Locally, use the "Test Pay" button (mock payment) to exercise the flow.

---

## 6. Discord login (optional, for customers)

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
   DISCORD_CLIENT_SECRET=paste-client-secret
   ```

The code side (wiring the Discord provider into the customer login flow) still
needs to be implemented — the values above are everything it will need.

---

## 7. Rotate leaked secrets (important)

These were exposed publicly in git history on Aug 28, 2026, so replace them:

- [ ] BlockCypher token → regenerate at blockcypher.com, update `.env`
- [ ] `ADMIN_PASSWORD` → pick a new one in `.env`
- [ ] `NEXTAUTH_SECRET` → generate a new one (step 2)
- [ ] `CRYPTO_WEBHOOK_SECRET` → generate a new one (not leaked, but set it if missing)
