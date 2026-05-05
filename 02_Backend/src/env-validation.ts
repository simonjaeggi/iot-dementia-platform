import z from "zod";
import { AccessCodeSchema } from "./api/auth/zod/access-code.schema";
import { EmailProviderSchema } from "./email/email.types";
import { PushProviderSchema } from "./push/push.types";

const envSchema = z.object({
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRATION_SECONDS: z.coerce.number().int().positive(),
  POSTGRES_USER: z.string().min(1, "POSTGRES_USER is required"),
  POSTGRES_PASSWORD: z.string().min(1, "POSTGRES_PASSWORD is required"),
  POSTGRES_DB: z.string().min(1, "POSTGRES_DB is required"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_HOST: z.string().min(1, "POSTGRES_HOST is required"),
  DATABASE_URL: z.url("DATABASE_URL must be a valid URL"),
  INITIAL_ACCESS_CODE: AccessCodeSchema,
  INTERNAL_HOST: z.string().min(1, "Internal host is required."),
  EXTERNAL_HOST: z.string().min(1, "External host is required."),
  SUPER_DANGEROUS_TURN_OFF_DEVICE_AUTH_FOR_TESTING: z.stringbool().default(false),
  PORT: z.coerce.number().int().positive(),
  EMAIL_PROVIDER: EmailProviderSchema,
  SENDGRID_API_KEY: z.string().min(1),
  FROM_EMAIL: z.email(),
  FROM_EMAIL_NAME: z.string().min(1),
  PUSH_PROVIDER: PushProviderSchema,
  PUSH_PROVIDER_URL: z.url(),
  GITLAB_API_BASE_URL: z.url(),
  GITLAB_PROJECT_ID: z.string().trim().min(1),
  GITLAB_TOKEN: z.string().trim().min(1),
  APP_VERSION: z.string().trim().min(1).optional(),
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
  INTERNAL_HOST: process.env.INTERNAL_HOST,
  EXTERNAL_HOST: process.env.EXTERNAL_HOST,
  SUPER_DANGEROUS_TURN_OFF_DEVICE_AUTH_FOR_TESTING:
    process.env.SUPER_DANGEROUS_TURN_OFF_DEVICE_AUTH_FOR_TESTING,
  PORT: process.env.PORT,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  FROM_EMAIL: process.env.FROM_EMAIL,
  FROM_EMAIL_NAME: process.env.FROM_EMAIL_NAME,
  PUSH_PROVIDER: process.env.PUSH_PROVIDER,
  PUSH_PROVIDER_URL: process.env.PUSH_PROVIDER_URL,
  GITLAB_API_BASE_URL: process.env.GITLAB_API_BASE_URL,
  GITLAB_PROJECT_ID: process.env.GITLAB_PROJECT_ID,
  GITLAB_TOKEN: process.env.GITLAB_TOKEN,
  APP_VERSION: process.env.APP_VERSION,
  SOFTWARE_UPDATE_POLL_INTERVAL_MS: process.env.SOFTWARE_UPDATE_POLL_INTERVAL_MS,
};

export const validateEnv: ValidateEnvFn = () => {
  return envSchema.parse(env);
};

export const validatedEnv = validateEnv();
