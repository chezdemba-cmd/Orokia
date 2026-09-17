import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET est requis"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET est requis"),
  OTP_HASH_SECRET: z.string().min(1, "OTP_HASH_SECRET est requis"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables d'environnement invalides :", parsed.error.flatten().fieldErrors);
  throw new Error("Configuration invalide — voir .env.example");
}

export const env = parsed.data;
