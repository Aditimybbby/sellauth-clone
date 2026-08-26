# SellAuth Clone

A self-hosted digital product selling platform with cryptocurrency payments. Built with Next.js 15, SQLite, and BlockCypher.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)

## ✨ Features

- **🛍️ Product Management** — Sell license keys, digital files, and services
- **💰 Crypto Payments** — Accept BTC, LTC via BlockCypher payment forwarding
- **🔑 License Key Delivery** — Automatic key assignment and instant delivery
- **📦 Digital File Downloads** — Secure file hosting and delivery
- **🧾 Live Invoice Pages** — Real-time payment tracking with QR codes
- **📊 Admin Dashboard** — Revenue analytics, order management, customer CRM
- **🏷️ Coupons & Discounts** — Percentage and fixed-amount discount codes
- **⭐ Customer Reviews** — Star ratings and comments on products
- **🛡️ Fraud Protection** — IP/email blacklisting and rate limiting
- **🌙 Dark Theme** — Beautiful, modern dark UI built with shadcn/ui

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | SQLite (via better-sqlite3) |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Auth | NextAuth.js |
| Payments | BlockCypher API |
| Icons | Lucide React |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/sellauth-clone.git
   cd sellauth-clone
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your settings (admin credentials, BlockCypher token, wallet address).

4. **Seed the database (optional):**
   ```bash
   npm run db:seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open in browser:**
   - 🏪 **Store:** [http://localhost:3000](http://localhost:3000)
   - 🔧 **Admin:** [http://localhost:3000/admin](http://localhost:3000/admin)

### Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `admin123` |

> ⚠️ Change these in your `.env` file before deploying!

## 📁 Project Structure

```
sellauth-clone/
├── src/
│   ├── app/
│   │   ├── (admin)/admin/     # Admin dashboard pages
│   │   ├── (store)/           # Public storefront pages
│   │   └── api/               # API routes
│   ├── components/
│   │   └── ui/                # shadcn/ui components
│   └── lib/
│       ├── db/                # Database schema, connection, migrations
│       └── payments/          # BlockCypher integration
├── data/                      # SQLite database (auto-created)
└── public/uploads/            # Digital product files
```

## 💳 Payment Flow

```
Customer → Checkout → Invoice Created → BlockCypher Generates Address
    ↓
Customer sends BTC/LTC to address
    ↓
BlockCypher detects payment → Webhook fires → Invoice marked COMPLETED
    ↓
License keys / download links delivered instantly
```

## 🔧 Configuration

### BlockCypher Setup

1. Create an account at [blockcypher.com](https://www.blockcypher.com)
2. Generate an API token
3. Add to `.env`:
   ```
   BLOCKCYPHER_TOKEN=your-token
   CRYPTO_DESTINATION_ADDRESS=your-btc-address
   CRYPTO_WEBHOOK_SECRET=random-secret-string
   ```

### Without BlockCypher

The platform works without BlockCypher by displaying your static wallet address for manual payments. Set `CRYPTO_DESTINATION_ADDRESS` in `.env` and customers will be shown that address with the payment amount.

## 📝 License

MIT License - feel free to use this for your own projects!
