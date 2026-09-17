-- Row Level Security — deuxième couche de cloisonnement multi-établissement,
-- sous le filtrage applicatif déjà en place. Le rôle applicatif ("orokia")
-- est propriétaire des tables : FORCE ROW LEVEL SECURITY est nécessaire pour
-- que les policies s'appliquent aussi à lui (par défaut Postgres exempte le
-- propriétaire d'une table de ses propres policies).

CREATE OR REPLACE FUNCTION app_current_ecole_id() RETURNS text AS $$
  SELECT current_setting('app.current_ecole_id', true);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_bypass_rls() RETURNS boolean AS $$
  SELECT current_setting('app.bypass_rls', true) = 'on';
$$ LANGUAGE sql STABLE;

-- === Niveau 1 : ecoleId en colonne directe ===

ALTER TABLE "ecoles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ecoles" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ecoles"
  USING (app_bypass_rls() OR "id" = app_current_ecole_id())
  WITH CHECK (app_bypass_rls() OR "id" = app_current_ecole_id());

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "profiles"
  USING (app_bypass_rls() OR "ecoleId" = app_current_ecole_id())
  WITH CHECK (app_bypass_rls() OR "ecoleId" = app_current_ecole_id());

ALTER TABLE "teachers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teachers" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "teachers"
  USING (app_bypass_rls() OR "ecoleId" = app_current_ecole_id())
  WITH CHECK (app_bypass_rls() OR "ecoleId" = app_current_ecole_id());

ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "students" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "students"
  USING (app_bypass_rls() OR "ecoleId" = app_current_ecole_id())
  WITH CHECK (app_bypass_rls() OR "ecoleId" = app_current_ecole_id());

ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "classes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "classes"
  USING (app_bypass_rls() OR "ecoleId" = app_current_ecole_id())
  WITH CHECK (app_bypass_rls() OR "ecoleId" = app_current_ecole_id());

ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subjects" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "subjects"
  USING (app_bypass_rls() OR "ecoleId" = app_current_ecole_id())
  WITH CHECK (app_bypass_rls() OR "ecoleId" = app_current_ecole_id());

ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "announcements" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "announcements"
  USING (app_bypass_rls() OR "ecoleId" = app_current_ecole_id())
  WITH CHECK (app_bypass_rls() OR "ecoleId" = app_current_ecole_id());

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "audit_logs"
  USING (app_bypass_rls() OR "ecoleId" = app_current_ecole_id())
  WITH CHECK (app_bypass_rls() OR "ecoleId" = app_current_ecole_id());

ALTER TABLE "terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "terms" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "terms"
  USING (app_bypass_rls() OR "ecoleId" = app_current_ecole_id())
  WITH CHECK (app_bypass_rls() OR "ecoleId" = app_current_ecole_id());

-- === Niveau 2 : ecoleId via une jointure directe ===

ALTER TABLE "teacher_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "teacher_assignments"
  USING (app_bypass_rls() OR "classeId" IN (SELECT id FROM "classes" WHERE "ecoleId" = app_current_ecole_id()))
  WITH CHECK (app_bypass_rls() OR "classeId" IN (SELECT id FROM "classes" WHERE "ecoleId" = app_current_ecole_id()));

ALTER TABLE "grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grades" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "grades"
  USING (app_bypass_rls() OR "classeId" IN (SELECT id FROM "classes" WHERE "ecoleId" = app_current_ecole_id()))
  WITH CHECK (app_bypass_rls() OR "classeId" IN (SELECT id FROM "classes" WHERE "ecoleId" = app_current_ecole_id()));

ALTER TABLE "report_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_cards" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "report_cards"
  USING (app_bypass_rls() OR "studentId" IN (SELECT id FROM "students" WHERE "ecoleId" = app_current_ecole_id()))
  WITH CHECK (app_bypass_rls() OR "studentId" IN (SELECT id FROM "students" WHERE "ecoleId" = app_current_ecole_id()));

ALTER TABLE "timetable_slots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timetable_slots" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "timetable_slots"
  USING (app_bypass_rls() OR "classeId" IN (SELECT id FROM "classes" WHERE "ecoleId" = app_current_ecole_id()))
  WITH CHECK (app_bypass_rls() OR "classeId" IN (SELECT id FROM "classes" WHERE "ecoleId" = app_current_ecole_id()));

ALTER TABLE "attendances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendances" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "attendances"
  USING (app_bypass_rls() OR "classeId" IN (SELECT id FROM "classes" WHERE "ecoleId" = app_current_ecole_id()))
  WITH CHECK (app_bypass_rls() OR "classeId" IN (SELECT id FROM "classes" WHERE "ecoleId" = app_current_ecole_id()));

ALTER TABLE "class_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "class_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "class_logs"
  USING (app_bypass_rls() OR "classeId" IN (SELECT id FROM "classes" WHERE "ecoleId" = app_current_ecole_id()))
  WITH CHECK (app_bypass_rls() OR "classeId" IN (SELECT id FROM "classes" WHERE "ecoleId" = app_current_ecole_id()));

ALTER TABLE "tuition_fees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tuition_fees" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tuition_fees"
  USING (app_bypass_rls() OR "studentId" IN (SELECT id FROM "students" WHERE "ecoleId" = app_current_ecole_id()))
  WITH CHECK (app_bypass_rls() OR "studentId" IN (SELECT id FROM "students" WHERE "ecoleId" = app_current_ecole_id()));

ALTER TABLE "payroll_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payroll_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payroll_lines"
  USING (app_bypass_rls() OR "teacherId" IN (SELECT id FROM "teachers" WHERE "ecoleId" = app_current_ecole_id()))
  WITH CHECK (app_bypass_rls() OR "teacherId" IN (SELECT id FROM "teachers" WHERE "ecoleId" = app_current_ecole_id()));

-- === Niveau 3 : ecoleId via deux jointures ===

ALTER TABLE "devoirs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "devoirs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "devoirs"
  USING (app_bypass_rls() OR "classLogId" IN (
    SELECT cl.id FROM "class_logs" cl JOIN "classes" c ON c.id = cl."classeId" WHERE c."ecoleId" = app_current_ecole_id()
  ))
  WITH CHECK (app_bypass_rls() OR "classLogId" IN (
    SELECT cl.id FROM "class_logs" cl JOIN "classes" c ON c.id = cl."classeId" WHERE c."ecoleId" = app_current_ecole_id()
  ));

ALTER TABLE "class_log_acks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "class_log_acks" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "class_log_acks"
  USING (app_bypass_rls() OR "classLogId" IN (
    SELECT cl.id FROM "class_logs" cl JOIN "classes" c ON c.id = cl."classeId" WHERE c."ecoleId" = app_current_ecole_id()
  ))
  WITH CHECK (app_bypass_rls() OR "classLogId" IN (
    SELECT cl.id FROM "class_logs" cl JOIN "classes" c ON c.id = cl."classeId" WHERE c."ecoleId" = app_current_ecole_id()
  ));

ALTER TABLE "escalation_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "escalation_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "escalation_events"
  USING (app_bypass_rls() OR "attendanceId" IN (
    SELECT a.id FROM "attendances" a JOIN "classes" c ON c.id = a."classeId" WHERE c."ecoleId" = app_current_ecole_id()
  ))
  WITH CHECK (app_bypass_rls() OR "attendanceId" IN (
    SELECT a.id FROM "attendances" a JOIN "classes" c ON c.id = a."classeId" WHERE c."ecoleId" = app_current_ecole_id()
  ));

ALTER TABLE "report_card_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_card_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "report_card_lines"
  USING (app_bypass_rls() OR "reportCardId" IN (
    SELECT rc.id FROM "report_cards" rc JOIN "students" s ON s.id = rc."studentId" WHERE s."ecoleId" = app_current_ecole_id()
  ))
  WITH CHECK (app_bypass_rls() OR "reportCardId" IN (
    SELECT rc.id FROM "report_cards" rc JOIN "students" s ON s.id = rc."studentId" WHERE s."ecoleId" = app_current_ecole_id()
  ));

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payments"
  USING (app_bypass_rls() OR "tuitionFeeId" IN (
    SELECT tf.id FROM "tuition_fees" tf JOIN "students" s ON s.id = tf."studentId" WHERE s."ecoleId" = app_current_ecole_id()
  ))
  WITH CHECK (app_bypass_rls() OR "tuitionFeeId" IN (
    SELECT tf.id FROM "tuition_fees" tf JOIN "students" s ON s.id = tf."studentId" WHERE s."ecoleId" = app_current_ecole_id()
  ));
