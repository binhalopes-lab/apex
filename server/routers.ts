import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

// ============================================================
// ADMIN PROCEDURE - Only for admin users
// ============================================================
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' });
  }
  return next({ ctx });
});

// ============================================================
// LEADER PROCEDURE - For admin and leader users
// ============================================================
const leaderProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'leader' && ctx.user.role !== 'captain') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a líderes' });
  }
  return next({ ctx });
});

// ============================================================
// EMPLOYEE ROUTER
// ============================================================
const employeeRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.enum(["active", "inactive", "suspended"]).optional() }).optional())
    .query(async ({ input }) => {
      return await db.getAllEmployees(input?.status);
    }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getEmployeeById(input.id);
    }),
  
  getByDepartment: protectedProcedure
    .input(z.object({ department: z.enum(["factory", "field"]) }))
    .query(async ({ input }) => {
      return await db.getEmployeesByDepartment(input.department);
    }),
  
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return await db.getEmployeeByUserId(ctx.user.id);
  }),
  
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      cpf: z.string().optional(),
      position: z.string().optional(),
      level: z.enum(["N1", "N2", "N3", "N4", "N5"]).default("N1"),
      baseSalary: z.number().default(0),
      hireDate: z.string().optional(),
      department: z.enum(["factory", "field"]).default("factory"),
      userId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createEmployee({
        ...input,
        hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
      });
      return { id };
    }),
  
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      cpf: z.string().optional(),
      position: z.string().optional(),
      level: z.enum(["N1", "N2", "N3", "N4", "N5"]).optional(),
      baseSalary: z.number().optional(),
      department: z.enum(["factory", "field"]).optional(),
      status: z.enum(["active", "inactive", "suspended"]).optional(),
      isInBerlinda: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateEmployee(id, data);
      return { success: true };
    }),
  
  getEvaluationHistory: protectedProcedure
    .input(z.object({ employeeId: z.number(), limit: z.number().default(12) }))
    .query(async ({ input }) => {
      return await db.getEmployeeEvaluationHistory(input.employeeId, input.limit);
    }),
  
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteEmployee(input.id);
      return { success: true };
    }),
});

// ============================================================
// CYCLE ROUTER
// ============================================================
const cycleRouter = router({
  getCurrent: protectedProcedure.query(async () => {
    return await db.getOrCreateCurrentCycle();
  }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getCycleById(input.id);
    }),
  
  list: protectedProcedure.query(async () => {
    return await db.getAllCycles();
  }),
  
  close: adminProcedure
    .input(z.object({ cycleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const cycle = await db.getCycleById(input.cycleId);
      if (!cycle) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ciclo não encontrado' });
      }
      if (cycle.status === 'closed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ciclo já está encerrado' });
      }
      await db.closeCycle(input.cycleId, ctx.user.id);
      return { success: true };
    }),
  
  getStats: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getDashboardStats(input.cycleId);
    }),
});

// ============================================================
// EVALUATION ROUTER
// ============================================================
const evaluationRouter = router({
  create: leaderProcedure
    .input(z.object({
      employeeId: z.number(),
      cycleId: z.number(),
      punctuality: z.number().min(0).max(20),
      organization: z.number().min(0).max(20),
      productivity: z.number().min(0).max(20),
      quality: z.number().min(0).max(20),
      safety: z.number().min(0).max(20),
      lateCount: z.number().min(0).default(0),
      notes: z.string().optional(),
      isOfficial: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if cycle is still active
      const cycle = await db.getCycleById(input.cycleId);
      if (!cycle || cycle.status === 'closed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ciclo já está encerrado' });
      }
      
      const id = await db.createEvaluation({
        ...input,
        evaluatorId: ctx.user.id,
      });
      
      // If marked as official, set it
      if (input.isOfficial) {
        await db.setOfficialEvaluation(id, input.cycleId, input.employeeId);
      }
      
      return { id };
    }),
  
  update: leaderProcedure
    .input(z.object({
      id: z.number(),
      punctuality: z.number().min(0).max(20).optional(),
      organization: z.number().min(0).max(20).optional(),
      productivity: z.number().min(0).max(20).optional(),
      quality: z.number().min(0).max(20).optional(),
      safety: z.number().min(0).max(20).optional(),
      lateCount: z.number().min(0).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const evaluation = await db.getEvaluationById(input.id);
      if (!evaluation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }
      
      const cycle = await db.getCycleById(evaluation.cycleId);
      if (!cycle || cycle.status === 'closed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ciclo já está encerrado' });
      }
      
      const { id, ...data } = input;
      await db.updateEvaluation(id, data);
      return { success: true };
    }),
  
  setOfficial: adminProcedure
    .input(z.object({ evaluationId: z.number() }))
    .mutation(async ({ input }) => {
      const evaluation = await db.getEvaluationById(input.evaluationId);
      if (!evaluation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }
      
      const cycle = await db.getCycleById(evaluation.cycleId);
      if (!cycle || cycle.status === 'closed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ciclo já está encerrado' });
      }
      
      await db.setOfficialEvaluation(input.evaluationId, evaluation.cycleId, evaluation.employeeId);
      return { success: true };
    }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getEvaluationById(input.id);
    }),
  
  listByCycle: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getEvaluationsByCycle(input.cycleId);
    }),
  
  listByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.number(), cycleId: z.number().optional() }))
    .query(async ({ input }) => {
      return await db.getEvaluationsByEmployee(input.employeeId, input.cycleId);
    }),
  
  getOfficial: protectedProcedure
    .input(z.object({ employeeId: z.number(), cycleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getOfficialEvaluation(input.employeeId, input.cycleId);
    }),
  
  // Calcula a média de todas as avaliações do colaborador no ciclo
  getAverageScore: protectedProcedure
    .input(z.object({ employeeId: z.number(), cycleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getEmployeeAverageScore(input.employeeId, input.cycleId);
    }),
  
  // Lista médias de todos os colaboradores no ciclo (para placar)
  getAllAverages: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getAllEmployeeAverages(input.cycleId);
    }),
  
  delete: leaderProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const evaluation = await db.getEvaluationById(input.id);
      if (!evaluation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Avaliação não encontrada' });
      }
      
      const cycle = await db.getCycleById(evaluation.cycleId);
      if (!cycle || cycle.status === 'closed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ciclo já está encerrado' });
      }
      
      await db.deleteEvaluation(input.id);
      return { success: true };
    }),
});

// ============================================================
// INCIDENT ROUTER
// ============================================================
const incidentRouter = router({
  create: leaderProcedure
    .input(z.object({
      employeeId: z.number(),
      cycleId: z.number(),
      evaluationId: z.number().optional(),
      type: z.enum(["rework", "warning", "accident", "absence", "other"]),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      description: z.string().optional(),
      blocksBonus: z.boolean().default(false),
      incidentDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createIncident({
        ...input,
        reportedBy: ctx.user.id,
        incidentDate: new Date(input.incidentDate),
      });
      return { id };
    }),
  
  listByCycle: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getIncidentsByCycle(input.cycleId);
    }),
  
  listByEmployee: protectedProcedure
    .input(z.object({ employeeId: z.number(), cycleId: z.number().optional() }))
    .query(async ({ input }) => {
      return await db.getIncidentsByEmployee(input.employeeId, input.cycleId);
    }),
});

// ============================================================
// REVENUE ROUTER
// ============================================================
const revenueRouter = router({
  create: adminProcedure
    .input(z.object({
      cycleId: z.number(),
      amount: z.number().min(1),
      projectName: z.string().optional(),
      description: z.string().optional(),
      revenueDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const cycle = await db.getCycleById(input.cycleId);
      if (!cycle || cycle.status === 'closed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ciclo já está encerrado' });
      }
      
      const id = await db.createRevenue({
        ...input,
        createdBy: ctx.user.id,
        revenueDate: new Date(input.revenueDate),
      });
      return { id };
    }),
  
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      amount: z.number().min(1).optional(),
      projectName: z.string().optional(),
      description: z.string().optional(),
      revenueDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, revenueDate, ...data } = input;
      await db.updateRevenue(id, {
        ...data,
        revenueDate: revenueDate ? new Date(revenueDate) : undefined,
      });
      return { success: true };
    }),
  
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteRevenue(input.id);
      return { success: true };
    }),
  
  listByCycle: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getRevenuesByCycle(input.cycleId);
    }),
  
  getCycleTotal: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      const total = await db.getCycleTotalRevenue(input.cycleId);
      const currentFlag = await db.getCurrentFlag(total);
      const nextFlag = await db.getNextFlag(total);
      return {
        total,
        currentFlag,
        nextFlag,
        amountToNextFlag: nextFlag ? nextFlag.minRevenue - total : 0,
      };
    }),
});

// ============================================================
// FLAG ROUTER
// ============================================================
const flagRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllFlags();
  }),
  
  create: adminProcedure
    .input(z.object({
      level: z.number().min(1).max(10),
      minRevenue: z.number().min(0),
      bonusPercentage: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createFlag(input);
      return { id };
    }),
  
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      minRevenue: z.number().min(0).optional(),
      bonusPercentage: z.number().min(0).max(100).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateFlag(id, data);
      return { success: true };
    }),
  
  getCurrent: protectedProcedure
    .input(z.object({ revenue: z.number() }))
    .query(async ({ input }) => {
      return await db.getCurrentFlag(input.revenue);
    }),
  
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteFlag(input.id);
      return { success: true };
    }),
});

// ============================================================
// COLLECTIVE METRICS ROUTER
// ============================================================
const collectiveRouter = router({
  get: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getOrCreateCollectiveMetrics(input.cycleId);
    }),
  
  update: adminProcedure
    .input(z.object({
      cycleId: z.number(),
      zeroAccidents: z.boolean().optional(),
      zeroCriticalRework: z.boolean().optional(),
      qualityApproved: z.boolean().optional(),
      deadlineMet: z.boolean().optional(),
      customerSatisfaction: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { cycleId, ...data } = input;
      await db.updateCollectiveMetrics(cycleId, data);
      return { success: true };
    }),
});

// ============================================================
// USER MANAGEMENT ROUTER
// ============================================================
const userRouter = router({
  list: adminProcedure.query(async () => {
    return await db.getAllUsers();
  }),
  
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getUserById(input.id);
    }),
  
  updateRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "leader", "captain", "employee"]),
    }))
    .mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),
  
  linkToEmployee: adminProcedure
    .input(z.object({
      userId: z.number(),
      employeeId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      await db.linkUserToEmployee(input.userId, input.employeeId);
      return { success: true };
    }),
});

// ============================================================
// SEED DATA ROUTER
// ============================================================
const seedRouter = router({
  all: adminProcedure.mutation(async () => {
    await db.seedFlags();
    await db.seedIndicators();
    await db.seedPromotionRequirements();
    return { success: true };
  }),
});

// ============================================================
// INDICATORS ROUTER
// ============================================================
const indicatorRouter = router({
  list: protectedProcedure.query(async () => {
    return await db.getAllIndicators();
  }),
  
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      description: z.string().optional(),
      maxScore: z.number().min(1).default(20),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createIndicator(input);
      return { id };
    }),
  
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      maxScore: z.number().min(1).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateIndicator(id, data);
      return { success: true };
    }),
});

// ============================================================
// PROMOTION ROUTER
// ============================================================
const promotionRouter = router({
  getRequirements: protectedProcedure.query(async () => {
    return await db.getPromotionRequirements();
  }),
  
  checkEligibility: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const employee = await db.getEmployeeById(input.employeeId);
      if (!employee) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Colaborador não encontrado' });
      }
      
      if (employee.level === "N5") {
        return { eligible: false, reason: "Já está no nível máximo (N5)" };
      }
      
      const requirements = await db.getPromotionRequirements();
      const req = requirements.find(r => r.fromLevel === employee.level);
      if (!req) {
        return { eligible: false, reason: "Requisitos de promoção não encontrados" };
      }
      
      const history = await db.getEmployeeEvaluationHistory(input.employeeId, req.consecutiveMonths);
      
      if (history.length < req.consecutiveMonths) {
        return {
          eligible: false,
          reason: `Necessário ${req.consecutiveMonths} meses de avaliação. Atual: ${history.length}`,
          requirement: req,
          history: history.map(h => ({ score: h.evaluation.totalScore, month: h.cycle.month, year: h.cycle.year })),
        };
      }
      
      const allMeetMinScore = history.every(h => h.evaluation.totalScore >= req.minScore);
      
      if (!allMeetMinScore) {
        return {
          eligible: false,
          reason: `Nota mínima de ${req.minScore} não atingida em todos os meses`,
          requirement: req,
          history: history.map(h => ({ score: h.evaluation.totalScore, month: h.cycle.month, year: h.cycle.year })),
        };
      }
      
      return {
        eligible: true,
        reason: `Pronto para promoção de ${employee.level} para ${req.toLevel}`,
        requirement: req,
        history: history.map(h => ({ score: h.evaluation.totalScore, month: h.cycle.month, year: h.cycle.year })),
      };
    }),
});

// ============================================================
// MAIN ROUTER
// ============================================================
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  
  employee: employeeRouter,
  cycle: cycleRouter,
  evaluation: evaluationRouter,
  incident: incidentRouter,
  revenue: revenueRouter,
  flag: flagRouter,
  collective: collectiveRouter,
  user: userRouter,
  seed: seedRouter,
  indicator: indicatorRouter,
  promotion: promotionRouter,
});

export type AppRouter = typeof appRouter;
