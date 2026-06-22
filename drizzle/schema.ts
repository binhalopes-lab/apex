import { serial, pgEnum, pgTable, text, timestamp, varchar, boolean, date } from "drizzle-orm/pg-core";

// ============================================================
// ENUMS - Tipos enumerados PostgreSQL
// ============================================================
export const roleEnum = pgEnum("role", ["admin", "leader", "captain", "employee"]);
export const levelEnum = pgEnum("level", ["N1", "N2", "N3", "N4", "N5"]);
export const cycleStatusEnum = pgEnum("cycle_status", ["active", "closed"]);
export const employeeStatusEnum = pgEnum("employee_status", ["active", "inactive", "suspended"]);
export const incidentTypeEnum = pgEnum("incident_type", ["rework", "warning", "accident", "absence", "other"]);
export const severityEnum = pgEnum("severity", ["low", "medium", "high", "critical"]);
export const promotionLevelEnum = pgEnum("promotion_level", ["N1", "N2", "N3", "N4"]);

// ============================================================
// USERS - Usuários do sistema com roles
// ============================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("employee").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// EMPLOYEES - Colaboradores da produção
// ============================================================
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: serial("userId").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  position: varchar("position", { length: 100 }), // Cargo
  level: levelEnum("level").default("N1").notNull(),
  baseSalary: int("baseSalary").default(0), // Salário base em centavos
  hireDate: date("hireDate"),
  status: employeeStatusEnum("status").default("active").notNull(),
  consecutiveMonthsAtLevel: int("consecutiveMonthsAtLevel").default(0), // Meses consecutivos no nível
  isInBerlinda: boolean("isInBerlinda").default(false),
  berlindaStartDate: date("berlindaStartDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ============================================================
// EVALUATION_CYCLES - Ciclos mensais de avaliação
// ============================================================
export const evaluationCycles = pgTable("evaluation_cycles", {
  id: serial("id").primaryKey(),
  year: serial("year").notNull(),
  month: serial("month").notNull(), // 1-12
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  status: cycleStatusEnum("status").default("active").notNull(),
  totalRevenue: serial("totalRevenue").default(0), // Faturamento total em centavos
  flagLevel: serial("flagLevel").default(0), // Bandeira atingida (1-5)
  flagPercentage: serial("flagPercentage").default(0), // Percentual de premiação
  closedAt: timestamp("closedAt"),
  closedBy: serial("closedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EvaluationCycle = typeof evaluationCycles.$inferSelect;
export type InsertEvaluationCycle = typeof evaluationCycles.$inferInsert;

// ============================================================
// EVALUATIONS - Avaliações dos colaboradores
// ============================================================
export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  employeeId: serial("employeeId").references(() => employees.id).notNull(),
  cycleId: serial("cycleId").references(() => evaluationCycles.id).notNull(),
  evaluatorId: serial("evaluatorId").references(() => users.id).notNull(),
  
  // Indicadores (0-20 cada)
  punctuality: serial("punctuality").default(0).notNull(), // Pontualidade
  organization: serial("organization").default(0).notNull(), // 5S / Organização
  productivity: serial("productivity").default(0).notNull(), // Produtividade
  quality: serial("quality").default(0).notNull(), // Qualidade
  safety: serial("safety").default(0).notNull(), // Segurança
  
  totalScore: serial("totalScore").default(0).notNull(), // Nota total (0-100)
  
  // Atrasos e ocorrências
  lateCount: serial("lateCount").default(0).notNull(), // Número de atrasos no mês
  
  notes: text("notes"), // Observações
  
  evaluatedAt: timestamp("evaluatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = typeof evaluations.$inferInsert;

// ============================================================
// INCIDENTS - Ocorrências (retrabalho, advertência, acidente, falta)
// ============================================================
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  employeeId: serial("employeeId").references(() => employees.id).notNull(),
  cycleId: serial("cycleId").references(() => evaluationCycles.id).notNull(),
  evaluationId: serial("evaluationId").references(() => evaluations.id),
  reportedBy: serial("reportedBy").references(() => users.id).notNull(),
  
  type: incidentTypeEnum("type").notNull(),
  severity: severityEnum("severity").default("medium").notNull(),
  description: text("description"),
  blocksBonus: boolean("blocksBonus").default(false).notNull(), // Bloqueia premiação
  
  incidentDate: date("incidentDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = typeof incidents.$inferInsert;

// ============================================================
// REVENUES - Lançamentos de faturamento
// ============================================================
export const revenues = pgTable("revenues", {
  id: serial("id").primaryKey(),
  cycleId: serial("cycleId").references(() => evaluationCycles.id).notNull(),
  createdBy: serial("createdBy").references(() => users.id).notNull(),
  
  amount: serial("amount").notNull(), // Valor em centavos
  projectName: varchar("projectName", { length: 255 }), // Nome da obra (opcional)
  description: text("description"),
  revenueDate: date("revenueDate").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Revenue = typeof revenues.$inferSelect;
export type InsertRevenue = typeof revenues.$inferInsert;

// ============================================================
// FLAGS - Configuração de bandeiras (parametrizável)
// ============================================================
export const flags = pgTable("flags", {
  id: serial("id").primaryKey(),
  level: serial("level").notNull().unique(), // 1-5
  minRevenue: serial("minRevenue").notNull(), // Faturamento mínimo em centavos
  bonusPercentage: serial("bonusPercentage").notNull(), // Percentual de premiação
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Flag = typeof flags.$inferSelect;
export type InsertFlag = typeof flags.$inferInsert;

// ============================================================
// INDICATORS - Configuração de indicadores (parametrizável)
// ============================================================
export const indicators = pgTable("indicators", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(), // punctuality, organization, etc.
  maxScore: serial("maxScore").default(20).notNull(),
  weight: serial("weight").default(1).notNull(), // Peso do indicador
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Indicator = typeof indicators.$inferSelect;
export type InsertIndicator = typeof indicators.$inferInsert;

// ============================================================
// PROMOTION_REQUIREMENTS - Requisitos para promoção por nível
// ============================================================
export const promotionRequirements = pgTable("promotion_requirements", {
  id: serial("id").primaryKey(),
  fromLevel: promotionLevelEnum("fromLevel").notNull(),
  toLevel: levelEnum("toLevel").notNull(),
  minScore: serial("minScore").notNull(), // Nota mínima exigida
  consecutiveMonths: serial("consecutiveMonths").default(2).notNull(), // Meses consecutivos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PromotionRequirement = typeof promotionRequirements.$inferSelect;
export type InsertPromotionRequirement = typeof promotionRequirements.$inferInsert;

// ============================================================
// COLLECTIVE_METRICS - Métricas coletivas do ciclo
// ============================================================
export const collectiveMetrics = pgTable("collective_metrics", {
  id: serial("id").primaryKey(),
  cycleId: serial("cycleId").references(() => evaluationCycles.id).notNull().unique(),
  
  zeroAccidents: boolean("zeroAccidents").default(true).notNull(),
  zeroCriticalRework: boolean("zeroCriticalRework").default(true).notNull(),
  qualityApproved: boolean("qualityApproved").default(true).notNull(),
  deadlineMet: boolean("deadlineMet").default(true).notNull(),
  customerSatisfaction: boolean("customerSatisfaction").default(true).notNull(),
  
  collectiveScore: serial("collectiveScore").default(100).notNull(), // 0-100
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CollectiveMetric = typeof collectiveMetrics.$inferSelect;
export type InsertCollectiveMetric = typeof collectiveMetrics.$inferInsert;
