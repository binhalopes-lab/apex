/**
 * APEX Performance System — db.pg.ts
 * Camada de acesso ao banco de dados — PostgreSQL (Supabase / Railway / Neon)
 *
 * Mudanças em relação ao db.ts MySQL original:
 *  - import drizzle de "drizzle-orm/postgres-js" (driver postgres-js)
 *  - onDuplicateKeyUpdate → onConflictDoUpdate (sintaxe PostgreSQL)
 *  - result[0].insertId → não existe no pg; usar .returning({ id: table.id })
 *  - COALESCE(SUM(...)) → mantido, funciona igual no PostgreSQL
 */

import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users,
  employees, InsertEmployee, Employee,
  evaluationCycles, InsertEvaluationCycle, EvaluationCycle,
  evaluations, InsertEvaluation, Evaluation,
  incidents, InsertIncident, Incident,
  revenues, InsertRevenue, Revenue,
  flags, InsertFlag, Flag,
  indicators, InsertIndicator,
  promotionRequirements, InsertPromotionRequirement,
  collectiveMetrics, InsertCollectiveMetric,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

// ============================================================
// CONEXÃO
// ============================================================
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // postgres-js aceita a connection string diretamente
      const client = postgres(process.env.DATABASE_URL, { prepare: false });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================
// USER OPERATIONS
// ============================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    // PostgreSQL: onConflictDoUpdate no lugar de onDuplicateKeyUpdate
    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "admin" | "leader" | "captain" | "employee") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function linkUserToEmployee(userId: number, employeeId: number | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(employees).set({ userId: null }).where(eq(employees.userId, userId));
  if (employeeId !== null) {
    await db.update(employees).set({ userId }).where(eq(employees.id, employeeId));
  }
}

// ============================================================
// EMPLOYEE OPERATIONS
// ============================================================
export async function createEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // .returning() substitui insertId do MySQL
  const result = await db.insert(employees).values(data).returning({ id: employees.id });
  return result[0].id;
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) return;
  await db.update(employees).set(data).where(eq(employees.id, id));
}

export async function deleteEmployee(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(employees).set({ status: "inactive" }).where(eq(employees.id, id));
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}

export async function getEmployeeByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
  return result[0];
}

export async function getAllEmployees(status?: "active" | "inactive" | "suspended") {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return await db.select().from(employees).where(eq(employees.status, status)).orderBy(employees.name);
  }
  return await db.select().from(employees).orderBy(employees.name);
}

export async function getEmployeesByDepartment(department: "factory" | "field") {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(employees)
    .where(and(eq(employees.department, department), eq(employees.status, "active")))
    .orderBy(employees.name);
}

// ============================================================
// EVALUATION CYCLE OPERATIONS
// ============================================================
export async function getOrCreateCurrentCycle(): Promise<EvaluationCycle> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const existing = await db
    .select()
    .from(evaluationCycles)
    .where(and(eq(evaluationCycles.year, year), eq(evaluationCycles.month, month)))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const result = await db
    .insert(evaluationCycles)
    .values({ year, month, startDate, endDate, status: "active", totalRevenue: 0, flagLevel: 0, flagPercentage: 0 })
    .returning({ id: evaluationCycles.id });

  const newCycle = await db
    .select()
    .from(evaluationCycles)
    .where(eq(evaluationCycles.id, result[0].id))
    .limit(1);

  return newCycle[0];
}

export async function getCycleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(evaluationCycles).where(eq(evaluationCycles.id, id)).limit(1);
  return result[0];
}

export async function getAllCycles() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(evaluationCycles)
    .orderBy(desc(evaluationCycles.year), desc(evaluationCycles.month));
}

export async function closeCycle(cycleId: number, closedBy: number) {
  const db = await getDb();
  if (!db) return;

  const revenueResult = await db
    .select({ total: sql<number>`SUM(amount)` })
    .from(revenues)
    .where(eq(revenues.cycleId, cycleId));

  const totalRevenue = revenueResult[0]?.total || 0;

  const flagResult = await db
    .select()
    .from(flags)
    .where(and(eq(flags.isActive, true), lte(flags.minRevenue, totalRevenue)))
    .orderBy(desc(flags.minRevenue))
    .limit(1);

  const flagLevel = flagResult[0]?.level || 0;
  const flagPercentage = flagResult[0]?.bonusPercentage || 0;

  await db.update(evaluationCycles).set({
    status: "closed",
    totalRevenue,
    flagLevel,
    flagPercentage,
    closedAt: new Date(),
    closedBy,
  }).where(eq(evaluationCycles.id, cycleId));
}

// ============================================================
// EVALUATION OPERATIONS
// ============================================================
export async function createEvaluation(data: InsertEvaluation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const totalScore =
    (data.punctuality || 0) +
    (data.organization || 0) +
    (data.productivity || 0) +
    (data.quality || 0) +
    (data.safety || 0);

  const result = await db
    .insert(evaluations)
    .values({ ...data, totalScore })
    .returning({ id: evaluations.id });

  return result[0].id;
}

export async function updateEvaluation(id: number, data: Partial<InsertEvaluation>) {
  const db = await getDb();
  if (!db) return;

  if (
    data.punctuality !== undefined ||
    data.organization !== undefined ||
    data.productivity !== undefined ||
    data.quality !== undefined ||
    data.safety !== undefined
  ) {
    const existing = await getEvaluationById(id);
    if (existing) {
      const totalScore =
        (data.punctuality ?? existing.punctuality) +
        (data.organization ?? existing.organization) +
        (data.productivity ?? existing.productivity) +
        (data.quality ?? existing.quality) +
        (data.safety ?? existing.safety);
      data = { ...data, totalScore } as Partial<InsertEvaluation>;
    }
  }

  await db.update(evaluations).set(data).where(eq(evaluations.id, id));
}

export async function getEvaluationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(evaluations).where(eq(evaluations.id, id)).limit(1);
  return result[0];
}

export async function deleteEvaluation(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(evaluations).where(eq(evaluations.id, id));
}

export async function getEvaluationsByEmployee(employeeId: number, cycleId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (cycleId) {
    return await db
      .select()
      .from(evaluations)
      .where(and(eq(evaluations.employeeId, employeeId), eq(evaluations.cycleId, cycleId)))
      .orderBy(desc(evaluations.evaluatedAt));
  }
  return await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.employeeId, employeeId))
    .orderBy(desc(evaluations.evaluatedAt));
}

export async function getEvaluationsByCycle(cycleId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.cycleId, cycleId))
    .orderBy(desc(evaluations.evaluatedAt));
}

export async function getEmployeeAverageScore(employeeId: number, cycleId: number) {
  const db = await getDb();
  if (!db) return null;

  const evals = await db
    .select()
    .from(evaluations)
    .where(and(eq(evaluations.employeeId, employeeId), eq(evaluations.cycleId, cycleId)));

  if (evals.length === 0) return null;

  const avg = (field: keyof typeof evals[0]) =>
    Math.round(evals.reduce((sum, e) => sum + (e[field] as number), 0) / evals.length);

  return {
    employeeId,
    cycleId,
    evaluationCount: evals.length,
    punctuality: avg("punctuality"),
    organization: avg("organization"),
    productivity: avg("productivity"),
    quality: avg("quality"),
    safety: avg("safety"),
    totalScore: avg("totalScore"),
    lateCount: evals.reduce((sum, e) => sum + e.lateCount, 0),
  };
}

export async function getAllEmployeeAverages(cycleId: number) {
  const db = await getDb();
  if (!db) return [];

  const activeEmployees = await db.select().from(employees).where(eq(employees.status, "active"));
  const cycleEvals = await db.select().from(evaluations).where(eq(evaluations.cycleId, cycleId));

  const results = activeEmployees.map((emp) => {
    const empEvals = cycleEvals.filter((e) => e.employeeId === emp.id);
    if (empEvals.length === 0) {
      return {
        employee: emp,
        evaluationCount: 0,
        averageScore: null,
        punctuality: 0,
        organization: 0,
        productivity: 0,
        quality: 0,
        safety: 0,
        lateCount: 0,
        isEligible: false,
      };
    }
    const avg = (field: keyof typeof empEvals[0]) =>
      Math.round(empEvals.reduce((sum, e) => sum + (e[field] as number), 0) / empEvals.length);

    const avgScore = avg("totalScore");
    const totalLateCount = empEvals.reduce((sum, e) => sum + e.lateCount, 0);

    return {
      employee: emp,
      evaluationCount: empEvals.length,
      averageScore: avgScore,
      punctuality: avg("punctuality"),
      organization: avg("organization"),
      productivity: avg("productivity"),
      quality: avg("quality"),
      safety: avg("safety"),
      lateCount: totalLateCount,
      isEligible: avgScore >= 70 && totalLateCount < 3,
    };
  });

  return results.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
}

export async function getOfficialEvaluation(employeeId: number, cycleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(evaluations)
    .where(
      and(
        eq(evaluations.employeeId, employeeId),
        eq(evaluations.cycleId, cycleId),
        eq(evaluations.isOfficial, true)
      )
    )
    .limit(1);
  return result[0];
}

export async function setOfficialEvaluation(evaluationId: number, cycleId: number, employeeId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(evaluations)
    .set({ isOfficial: false })
    .where(and(eq(evaluations.cycleId, cycleId), eq(evaluations.employeeId, employeeId)));
  await db.update(evaluations).set({ isOfficial: true }).where(eq(evaluations.id, evaluationId));
}

export async function getEmployeeEvaluationHistory(employeeId: number, limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({ evaluation: evaluations, cycle: evaluationCycles })
    .from(evaluations)
    .innerJoin(evaluationCycles, eq(evaluations.cycleId, evaluationCycles.id))
    .where(and(eq(evaluations.employeeId, employeeId), eq(evaluations.isOfficial, true)))
    .orderBy(desc(evaluationCycles.year), desc(evaluationCycles.month))
    .limit(limit);
}

// ============================================================
// INCIDENT OPERATIONS
// ============================================================
export async function createIncident(data: InsertIncident) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(incidents).values(data).returning({ id: incidents.id });
  return result[0].id;
}

export async function getIncidentsByEmployee(employeeId: number, cycleId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (cycleId) {
    return await db
      .select()
      .from(incidents)
      .where(and(eq(incidents.employeeId, employeeId), eq(incidents.cycleId, cycleId)))
      .orderBy(desc(incidents.incidentDate));
  }
  return await db
    .select()
    .from(incidents)
    .where(eq(incidents.employeeId, employeeId))
    .orderBy(desc(incidents.incidentDate));
}

export async function getIncidentsByCycle(cycleId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(incidents)
    .where(eq(incidents.cycleId, cycleId))
    .orderBy(desc(incidents.incidentDate));
}

// ============================================================
// REVENUE OPERATIONS
// ============================================================
export async function createRevenue(data: InsertRevenue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(revenues).values(data).returning({ id: revenues.id });
  return result[0].id;
}

export async function updateRevenue(id: number, data: Partial<InsertRevenue>) {
  const db = await getDb();
  if (!db) return;
  await db.update(revenues).set(data).where(eq(revenues.id, id));
}

export async function deleteRevenue(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(revenues).where(eq(revenues.id, id));
}

export async function getRevenuesByCycle(cycleId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(revenues)
    .where(eq(revenues.cycleId, cycleId))
    .orderBy(desc(revenues.revenueDate));
}

export async function getCycleTotalRevenue(cycleId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(revenues)
    .where(eq(revenues.cycleId, cycleId));
  return result[0]?.total || 0;
}

// ============================================================
// FLAG OPERATIONS
// ============================================================
export async function getAllFlags() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(flags).orderBy(flags.level);
}

export async function createFlag(data: InsertFlag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(flags).values(data).returning({ id: flags.id });
  return result[0].id;
}

export async function updateFlag(id: number, data: Partial<InsertFlag>) {
  const db = await getDb();
  if (!db) return;
  await db.update(flags).set(data).where(eq(flags.id, id));
}

export async function deleteFlag(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(flags).where(eq(flags.id, id));
}

export async function getCurrentFlag(revenue: number): Promise<Flag | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(flags)
    .where(and(eq(flags.isActive, true), lte(flags.minRevenue, revenue)))
    .orderBy(desc(flags.minRevenue))
    .limit(1);
  return result[0];
}

export async function getNextFlag(currentRevenue: number): Promise<Flag | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(flags)
    .where(and(eq(flags.isActive, true), gte(flags.minRevenue, currentRevenue)))
    .orderBy(flags.minRevenue)
    .limit(1);

  if (result[0] && result[0].minRevenue <= currentRevenue) {
    const next = await db
      .select()
      .from(flags)
      .where(and(eq(flags.isActive, true), gte(flags.minRevenue, currentRevenue + 1)))
      .orderBy(flags.minRevenue)
      .limit(1);
    return next[0];
  }
  return result[0];
}

// ============================================================
// INDICATOR OPERATIONS
// ============================================================
export async function getAllIndicators() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(indicators).where(eq(indicators.isActive, true));
}

export async function createIndicator(data: InsertIndicator) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(indicators).values(data).returning({ id: indicators.id });
  return result[0].id;
}

export async function updateIndicator(id: number, data: Partial<InsertIndicator>) {
  const db = await getDb();
  if (!db) return;
  await db.update(indicators).set(data).where(eq(indicators.id, id));
}

export async function seedIndicators() {
  const db = await getDb();
  if (!db) return;
  const defaultIndicators = [
    { name: "Pontualidade", code: "punctuality", maxScore: 20, weight: 1, description: "Chegar no horário e cumprir jornada" },
    { name: "Organização (5S)", code: "organization", maxScore: 20, weight: 1, description: "Manter ambiente limpo e organizado" },
    { name: "Produtividade", code: "productivity", maxScore: 20, weight: 1, description: "Entregar tarefas no prazo com eficiência" },
    { name: "Qualidade", code: "quality", maxScore: 20, weight: 1, description: "Trabalho sem retrabalho, bem executado" },
    { name: "Segurança", code: "safety", maxScore: 20, weight: 1, description: "Uso de EPIs e práticas seguras" },
  ];
  for (const ind of defaultIndicators) {
    await db
      .insert(indicators)
      .values(ind)
      .onConflictDoUpdate({ target: indicators.code, set: { name: ind.name } });
  }
}

// ============================================================
// PROMOTION REQUIREMENTS OPERATIONS
// ============================================================
export async function getPromotionRequirements() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(promotionRequirements);
}

export async function seedPromotionRequirements() {
  const db = await getDb();
  if (!db) return;
  const requirements = [
    { fromLevel: "N1" as const, toLevel: "N2" as const, minScore: 70, consecutiveMonths: 2 },
    { fromLevel: "N2" as const, toLevel: "N3" as const, minScore: 75, consecutiveMonths: 2 },
    { fromLevel: "N3" as const, toLevel: "N4" as const, minScore: 80, consecutiveMonths: 2 },
    { fromLevel: "N4" as const, toLevel: "N5" as const, minScore: 85, consecutiveMonths: 2 },
  ];
  for (const req of requirements) {
    const existing = await db
      .select()
      .from(promotionRequirements)
      .where(
        and(
          eq(promotionRequirements.fromLevel, req.fromLevel),
          eq(promotionRequirements.toLevel, req.toLevel)
        )
      )
      .limit(1);
    if (existing.length === 0) {
      await db.insert(promotionRequirements).values(req);
    }
  }
}

// ============================================================
// COLLECTIVE METRICS OPERATIONS
// ============================================================
export async function getOrCreateCollectiveMetrics(cycleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(collectiveMetrics)
    .where(eq(collectiveMetrics.cycleId, cycleId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  await db.insert(collectiveMetrics).values({ cycleId });

  const created = await db
    .select()
    .from(collectiveMetrics)
    .where(eq(collectiveMetrics.cycleId, cycleId))
    .limit(1);

  return created[0];
}

export async function updateCollectiveMetrics(cycleId: number, data: Partial<InsertCollectiveMetric>) {
  const db = await getDb();
  if (!db) return;

  const metrics = await getOrCreateCollectiveMetrics(cycleId);
  const updated = { ...metrics, ...data };

  let score = 0;
  if (updated.zeroAccidents) score += 20;
  if (updated.zeroCriticalRework) score += 20;
  if (updated.qualityApproved) score += 20;
  if (updated.deadlineMet) score += 20;
  if (updated.customerSatisfaction) score += 20;

  await db
    .update(collectiveMetrics)
    .set({ ...data, collectiveScore: score })
    .where(eq(collectiveMetrics.cycleId, cycleId));
}

// ============================================================
// SEED FLAGS
// ============================================================
export async function seedFlags() {
  const db = await getDb();
  if (!db) return;
  const defaultFlags = [
    { level: 1, minRevenue: 5000000, bonusPercentage: 15 },
    { level: 2, minRevenue: 8000000, bonusPercentage: 30 },
    { level: 3, minRevenue: 11000000, bonusPercentage: 45 },
    { level: 4, minRevenue: 15000000, bonusPercentage: 60 },
    { level: 5, minRevenue: 20000000, bonusPercentage: 75 },
  ];
  for (const flag of defaultFlags) {
    const existing = await db.select().from(flags).where(eq(flags.level, flag.level)).limit(1);
    if (existing.length === 0) {
      await db.insert(flags).values(flag);
    }
  }
}

// ============================================================
// DASHBOARD STATISTICS
// ============================================================
export async function getDashboardStats(cycleId: number) {
  const db = await getDb();
  if (!db) return null;

  const cycle = await getCycleById(cycleId);
  if (!cycle) return null;

  const totalRevenue = await getCycleTotalRevenue(cycleId);
  const currentFlag = await getCurrentFlag(totalRevenue);
  const nextFlag = await getNextFlag(totalRevenue);

  const allEmployees = await getAllEmployees("active");
  const cycleEvaluations = await getEvaluationsByCycle(cycleId);
  const officialEvaluations = cycleEvaluations.filter((e) => e.isOfficial);

  const eligible = officialEvaluations.filter((e) => e.totalScore >= 70 && e.lateCount < 3);
  const blocked = officialEvaluations.filter((e) => e.totalScore < 70 || e.lateCount >= 3);
  const inBerlinda = officialEvaluations.filter((e) => e.totalScore < 50);

  const employeesWithHistory = await Promise.all(
    allEmployees.map(async (emp) => {
      const history = await getEmployeeEvaluationHistory(emp.id, 2);
      return { employee: emp, history };
    })
  );

  const requirements = await getPromotionRequirements();
  const readyForPromotion = employeesWithHistory.filter(({ employee, history }) => {
    if (employee.level === "N5") return false;
    const req = requirements.find((r) => r.fromLevel === employee.level);
    if (!req || history.length < req.consecutiveMonths) return false;
    return history.every((h) => h.evaluation.totalScore >= req.minScore);
  });

  return {
    cycle,
    totalRevenue,
    currentFlag,
    nextFlag,
    amountToNextFlag: nextFlag ? nextFlag.minRevenue - totalRevenue : 0,
    totalEmployees: allEmployees.length,
    evaluatedCount: officialEvaluations.length,
    pendingEvaluations: allEmployees.length - officialEvaluations.length,
    eligibleCount: eligible.length,
    blockedCount: blocked.length,
    berlindaCount: inBerlinda.length,
    readyForPromotionCount: readyForPromotion.length,
    estimatedBonusCost: eligible.reduce((sum, e) => {
      const emp = allEmployees.find((emp) => emp.id === e.employeeId);
      if (!emp || !currentFlag) return sum;
      return sum + Math.round((emp.baseSalary || 0) * (currentFlag.bonusPercentage / 100));
    }, 0),
  };
}
