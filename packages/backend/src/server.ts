import { env } from "./config/env.js";
import { buildApp } from "./app.js";
import { AttendanceService } from "./modules/attendance/service.js";
import { withRlsBypass } from "./lib/tenant-context.js";

const ESCALATION_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  const escalationTimer = setInterval(() => {
    withRlsBypass(app.prisma, (tx) => new AttendanceService(tx).checkEscalations())
      .then((count) => {
        if (count > 0) app.log.info(`Escalade absences : ${count} événement(s) créé(s).`);
      })
      .catch((err) => app.log.error(err, "Échec du job d'escalade des absences"));
  }, ESCALATION_CHECK_INTERVAL_MS);
  escalationTimer.unref();
}

main();
