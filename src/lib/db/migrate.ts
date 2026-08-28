import { client } from './index';

export async function runMigrations() {
  // Create tables directly using raw SQL
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      short_description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'KEY' CHECK(type IN ('KEY', 'FILE', 'SERVICE')),
      image_url TEXT,
      file_path TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK(visibility IN ('PUBLIC', 'UNLISTED', 'HIDDEN')),
      category_id TEXT REFERENCES categories(id),
      min_quantity INTEGER DEFAULT 1,
      max_quantity INTEGER DEFAULT 100,
      custom_fields TEXT DEFAULT '[]',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      total_spent REAL NOT NULL DEFAULT 0,
      order_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('PERCENTAGE', 'FIXED')),
      discount_value REAL NOT NULL,
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      product_id TEXT REFERENCES products(id),
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      customer_email TEXT NOT NULL,
      total_amount REAL NOT NULL,
      crypto_amount TEXT,
      crypto_currency TEXT DEFAULT 'btc',
      payment_address TEXT,
      forwarder_id TEXT,
      tx_hash TEXT,
      confirmations INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'DETECTED', 'CONFIRMING', 'COMPLETED', 'EXPIRED', 'PARTIALLY_PAID', 'REFUNDED')),
      coupon_id TEXT REFERENCES coupons(id),
      discount_amount REAL DEFAULT 0,
      expires_at TEXT,
      paid_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      customer_id TEXT REFERENCES customers(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'FULFILLED', 'REFUNDED', 'CANCELLED')),
      delivered_content TEXT,
      customer_inputs TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS license_keys (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      key_value TEXT NOT NULL,
      is_used INTEGER NOT NULL DEFAULT 0,
      order_id TEXT REFERENCES orders(id),
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      order_id TEXT REFERENCES orders(id),
      customer_email TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS blacklist (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('IP', 'EMAIL')),
      value TEXT NOT NULL,
      reason TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      order_id TEXT REFERENCES orders(id),
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED')),
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      sender TEXT NOT NULL CHECK(sender IN ('CUSTOMER', 'ADMIN')),
      message TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT
    );
  `);

  // Column additions for existing databases (each statement runs separately so
  // a "duplicate column" error on one never blocks the rest).
  const alterations = [
    'ALTER TABLE invoices ADD COLUMN baseline_balance REAL DEFAULT 0',
  ];
  for (const sql of alterations) {
    try {
      await client.execute(sql);
    } catch {
      // column already exists on this database — nothing to do
    }
  }

  // Insert default settings
  const defaultSettings = [
    { key: 'store_name', value: 'My Store' },
    { key: 'store_description', value: 'Digital products store' },
    { key: 'store_logo', value: '' },
    { key: 'accent_color', value: '#6366f1' },
    { key: 'announcement', value: '' },
    { key: 'currency', value: 'USD' },
    { key: 'invoice_timeout_minutes', value: '30' },
    { key: 'btc_address', value: '' },
    { key: 'ltc_address', value: '' },
    { key: 'blockcypher_token', value: '' },
  ];

  for (const s of defaultSettings) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
      args: [s.key, s.value, new Date().toISOString()],
    });
  }
}
