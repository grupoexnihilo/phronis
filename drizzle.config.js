import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default defineConfig({
  // Mudamos aqui para buscar qualquer arquivo dentro da pasta db
  schema: './src/db/schema.js', 
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
  url: "postgresql://neondb_owner:npg_pAfRcrTN8vC6@ep-ancient-breeze-ackv2ffg-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
},
});