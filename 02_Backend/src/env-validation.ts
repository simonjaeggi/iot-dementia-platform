import z from "zod";
import { AccessCodeSchema } from "./auth/zod/access-code.schema";

const envSchema = z.object({
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRATION_SECONDS: z.coerce.number().int().positive(),
  POSTGRES_USER: z.string().min(1, "POSTGRES_USER is required"),
  POSTGRES_PASSWORD: z.string().min(1, "POSTGRES_PASSWORD is required"),
  POSTGRES_DB: z.string().min(1, "POSTGRES_DB is required"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_HOST: z.string().min(1, "POSTGRES_HOST is required"),
  DATABASE_URL: z.url("DATABASE_URL must be a valid URL"),
  INITIAL_ACCESS_CODE: AccessCodeSchema
});

type EnvType = z.infer<typeof envSchema>;
type ValidateEnvFn = () => EnvType;

const env = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRATION_SECONDS: process.env.JWT_EXPIRATION_SECONDS,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  POSTGRES_DB: process.env.POSTGRES_DB,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
  POSTGRES_HOST: process.env.POSTGRES_HOST,
  DATABASE_URL: process.env.DATABASE_URL,
  INITIAL_ACCESS_CODE: process.env.INITIAL_ACCESS_CODE,
};

export const validateEnv: ValidateEnvFn = () => {
  return envSchema.parse(env);
};

export const validatedEnv = validateEnv();
