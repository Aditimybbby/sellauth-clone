import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolve relative to this module so the DB path is stable regardless of the
// caller's cwd (tsx / next dev / drizzle-kit all run from different dirs).
const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, '..', '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'store.db');

const client = createClient({
  url: `file:${dbPath}`,
});

export const db = drizzle(client, { schema });
export { client };
