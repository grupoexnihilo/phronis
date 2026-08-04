import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Isso evita que o db.js tente rodar no navegador
let db = null;

if (typeof window === 'undefined') {
    const connectionString = process.env.DATABASE_URL;
    const sql = neon(connectionString);
    db = drizzle(sql);
}

export { db };