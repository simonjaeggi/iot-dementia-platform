import { defineConfig } from 'drizzle-kit';
import { validatedEnv } from './src/env-validation';


export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: validatedEnv.DATABASE_URL,
  },
});