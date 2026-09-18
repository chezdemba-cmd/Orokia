import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

import prismaPlugin from "./plugins/prisma.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import authenticatePlugin from "./middleware/authenticate.js";
import authenticateAdminPlugin from "./middleware/authenticate-admin.js";
import { healthRoutes } from "./modules/health/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { classesRoutes } from "./modules/classes/routes.js";
import { studentsRoutes } from "./modules/students/routes.js";
import { reportsRoutes } from "./modules/reports/routes.js";
import { gradesRoutes, termsRoutes, reportCardsRoutes } from "./modules/grades/routes.js";
import { classeTimetableRoutes, timetableSlotRoutes } from "./modules/timetable/routes.js";
import { attendanceRoutes } from "./modules/attendance/routes.js";
import { classLogRoutes } from "./modules/classlog/routes.js";
import { messagingRoutes } from "./modules/messaging/routes.js";
import { announcementsRoutes } from "./modules/announcements/routes.js";
import { accountsRoutes } from "./modules/accounts/routes.js";
import { auditRoutes } from "./modules/audit/routes.js";
import { tuitionRoutes } from "./modules/tuition/routes.js";
import { payrollRoutes } from "./modules/payroll/routes.js";
import { familyRoutes } from "./modules/family/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { cronRoutes } from "./modules/cron/routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info",
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(cookie);

  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(authenticatePlugin);
  await app.register(authenticateAdminPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(classesRoutes, { prefix: "/classes" });
  await app.register(studentsRoutes, { prefix: "/students" });
  await app.register(reportsRoutes, { prefix: "/reports" });
  await app.register(gradesRoutes, { prefix: "/grades" });
  await app.register(termsRoutes, { prefix: "/terms" });
  await app.register(reportCardsRoutes, { prefix: "/report-cards" });
  await app.register(classeTimetableRoutes, { prefix: "/classes" });
  await app.register(timetableSlotRoutes, { prefix: "/timetable" });
  await app.register(attendanceRoutes, { prefix: "/classes" });
  await app.register(classLogRoutes, { prefix: "/classes" });
  await app.register(messagingRoutes, { prefix: "/messaging" });
  await app.register(announcementsRoutes, { prefix: "/announcements" });
  await app.register(accountsRoutes, { prefix: "/accounts" });
  await app.register(auditRoutes, { prefix: "/audit-log" });
  await app.register(tuitionRoutes, { prefix: "/tuition" });
  await app.register(payrollRoutes, { prefix: "/payroll" });
  await app.register(familyRoutes, { prefix: "/family" });
  await app.register(adminRoutes, { prefix: "/admin" });
  await app.register(cronRoutes, { prefix: "/internal/cron" });

  return app;
}
