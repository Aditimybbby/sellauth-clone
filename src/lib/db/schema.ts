import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const genId = () => nanoid(16);

export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(genId),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').default(''),
  shortDescription: text('short_description').default(''),
  price: real('price').notNull().default(0),
  type: text('type', { enum: ['KEY', 'FILE', 'SERVICE'] }).notNull().default('KEY'),
  imageUrl: text('image_url'),
  filePath: text('file_path'),
  stock: integer('stock').notNull().default(0),
  visibility: text('visibility', { enum: ['PUBLIC', 'UNLISTED', 'HIDDEN'] }).notNull().default('PUBLIC'),
  categoryId: text('category_id').references(() => categories.id),
  minQuantity: integer('min_quantity').default(1),
  maxQuantity: integer('max_quantity').default(100),
  customFields: text('custom_fields').default('[]'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().$defaultFn(genId),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const licenseKeys = sqliteTable('license_keys', {
  id: text('id').primaryKey().$defaultFn(genId),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  keyValue: text('key_value').notNull(),
  isUsed: integer('is_used', { mode: 'boolean' }).notNull().default(false),
  orderId: text('order_id').references(() => orders.id),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey().$defaultFn(genId),
  email: text('email').notNull().unique(),
  ipAddress: text('ip_address'),
  totalSpent: real('total_spent').notNull().default(0),
  orderCount: integer('order_count').notNull().default(0),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey().$defaultFn(genId),
  customerId: text('customer_id').references(() => customers.id),
  customerEmail: text('customer_email').notNull(),
  totalAmount: real('total_amount').notNull(),
  cryptoAmount: text('crypto_amount'),
  cryptoCurrency: text('crypto_currency').default('btc'),
  paymentAddress: text('payment_address'),
  forwarderId: text('forwarder_id'),
  txHash: text('tx_hash'),
  confirmations: integer('confirmations').default(0),
  status: text('status', { enum: ['PENDING', 'DETECTED', 'CONFIRMING', 'COMPLETED', 'EXPIRED', 'PARTIALLY_PAID', 'REFUNDED'] }).notNull().default('PENDING'),
  couponId: text('coupon_id').references(() => coupons.id),
  discountAmount: real('discount_amount').default(0),
  baselineBalance: real('baseline_balance').default(0),
  expiresAt: text('expires_at'),
  paidAt: text('paid_at'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(genId),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id),
  productId: text('product_id').notNull().references(() => products.id),
  customerId: text('customer_id').references(() => customers.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  status: text('status', { enum: ['PENDING', 'FULFILLED', 'REFUNDED', 'CANCELLED'] }).notNull().default('PENDING'),
  deliveredContent: text('delivered_content'),
  customerInputs: text('customer_inputs'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const coupons = sqliteTable('coupons', {
  id: text('id').primaryKey().$defaultFn(genId),
  code: text('code').notNull().unique(),
  discountType: text('discount_type', { enum: ['PERCENTAGE', 'FIXED'] }).notNull(),
  discountValue: real('discount_value').notNull(),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  productId: text('product_id').references(() => products.id),
  expiresAt: text('expires_at'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey().$defaultFn(genId),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  orderId: text('order_id').references(() => orders.id),
  customerEmail: text('customer_email').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const blacklist = sqliteTable('blacklist', {
  id: text('id').primaryKey().$defaultFn(genId),
  type: text('type', { enum: ['IP', 'EMAIL'] }).notNull(),
  value: text('value').notNull(),
  reason: text('reason'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey().$defaultFn(genId),
  customerId: text('customer_id').notNull().references(() => customers.id),
  orderId: text('order_id').references(() => orders.id),
  subject: text('subject').notNull(),
  status: text('status', { enum: ['OPEN', 'CLOSED'] }).notNull().default('OPEN'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const ticketMessages = sqliteTable('ticket_messages', {
  id: text('id').primaryKey().$defaultFn(genId),
  ticketId: text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  sender: text('sender', { enum: ['CUSTOMER', 'ADMIN'] }).notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// Relations
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  licenseKeys: many(licenseKeys),
  orders: many(orders),
  reviews: many(reviews),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const licenseKeysRelations = relations(licenseKeys, ({ one }) => ({
  product: one(products, { fields: [licenseKeys.productId], references: [products.id] }),
  order: one(orders, { fields: [licenseKeys.orderId], references: [orders.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  orders: many(orders),
  coupon: one(coupons, { fields: [invoices.couponId], references: [coupons.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  invoice: one(invoices, { fields: [orders.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [orders.productId], references: [products.id] }),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
  orders: many(orders),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  customer: one(customers, { fields: [tickets.customerId], references: [customers.id] }),
  order: one(orders, { fields: [tickets.orderId], references: [orders.id] }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketMessages.ticketId], references: [tickets.id] }),
}));
