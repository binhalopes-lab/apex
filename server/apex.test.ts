import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock database functions
vi.mock("./db", () => ({
  getOrCreateCurrentCycle: vi.fn().mockResolvedValue({
    id: 1,
    year: 2025,
    month: 12,
    startDate: new Date("2025-12-01"),
    endDate: new Date("2025-12-31"),
    status: "active",
    totalRevenue: 0,
    flagLevel: null,
    flagPercentage: null,
    closedAt: null,
    closedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getCycleById: vi.fn().mockResolvedValue({
    id: 1,
    year: 2025,
    month: 12,
    status: "active",
    totalRevenue: 0,
  }),
  getAllCycles: vi.fn().mockResolvedValue([
    { id: 1, year: 2025, month: 12, status: "active" },
    { id: 2, year: 2025, month: 11, status: "closed" },
  ]),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalEmployees: 10,
    evaluatedCount: 8,
    averageScore: 75.5,
    inBerlindaCount: 1,
    blockedCount: 0,
    promotionReadyCount: 2,
  }),
  getAllEmployees: vi.fn().mockResolvedValue([
    { id: 1, name: "João Silva", level: "N2", status: "active" },
    { id: 2, name: "Maria Santos", level: "N3", status: "active" },
  ]),
  getEmployeeById: vi.fn().mockResolvedValue({
    id: 1,
    name: "João Silva",
    level: "N2",
    status: "active",
    baseSalary: 200000,
  }),
  getEvaluationsByCycle: vi.fn().mockResolvedValue([
    {
      id: 1,
      employeeId: 1,
      cycleId: 1,
      punctuality: 18,
      organization: 17,
      productivity: 19,
      quality: 16,
      behavior: 18,
      totalScore: 88,
      lateCount: 1,
      isOfficial: true,
    },
  ]),
  getAllFlags: vi.fn().mockResolvedValue([
    { id: 1, level: 1, minRevenue: 5000000, bonusPercentage: 15, isActive: true },
    { id: 2, level: 2, minRevenue: 7500000, bonusPercentage: 30, isActive: true },
    { id: 3, level: 3, minRevenue: 10000000, bonusPercentage: 45, isActive: true },
  ]),
  getCurrentFlag: vi.fn().mockResolvedValue({
    id: 2,
    level: 2,
    minRevenue: 7500000,
    bonusPercentage: 30,
  }),
  getAllIndicators: vi.fn().mockResolvedValue([
    { id: 1, name: "Pontualidade", code: "punctuality", maxScore: 20, isActive: true },
    { id: 2, name: "Organização", code: "organization", maxScore: 20, isActive: true },
    { id: 3, name: "Produtividade", code: "productivity", maxScore: 20, isActive: true },
    { id: 4, name: "Qualidade", code: "quality", maxScore: 20, isActive: true },
    { id: 5, name: "Comportamento", code: "behavior", maxScore: 20, isActive: true },
  ]),
  getPromotionRequirements: vi.fn().mockResolvedValue([
    { fromLevel: "N1", toLevel: "N2", minScore: 70, consecutiveMonths: 2 },
    { fromLevel: "N2", toLevel: "N3", minScore: 75, consecutiveMonths: 2 },
    { fromLevel: "N3", toLevel: "N4", minScore: 80, consecutiveMonths: 2 },
    { fromLevel: "N4", toLevel: "N5", minScore: 85, consecutiveMonths: 2 },
  ]),
  getEmployeeEvaluationHistory: vi.fn().mockResolvedValue([
    { evaluation: { totalScore: 80 }, cycle: { month: 11, year: 2025 } },
    { evaluation: { totalScore: 82 }, cycle: { month: 10, year: 2025 } },
  ]),
  getRevenueByCycle: vi.fn().mockResolvedValue([
    { id: 1, amount: 2500000, projectName: "Projeto A" },
    { id: 2, amount: 3000000, projectName: "Projeto B" },
  ]),
  getCycleTotalRevenue: vi.fn().mockResolvedValue(5500000),
}));

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@apex.com",
    name: "Admin APEX",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createLeaderContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "leader-user",
    email: "leader@apex.com",
    name: "Líder APEX",
    loginMethod: "manus",
    role: "leader",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createEmployeeContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "employee-user",
    email: "employee@apex.com",
    name: "Colaborador APEX",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Cycle Router", () => {
  it("should get current cycle", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cycle.getCurrent();

    expect(result).toBeDefined();
    expect(result?.year).toBe(2025);
    expect(result?.month).toBe(12);
    expect(result?.status).toBe("active");
  });

  it("should list all cycles", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cycle.list();

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("active");
    expect(result[1].status).toBe("closed");
  });

  it("should get cycle stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cycle.getStats({ cycleId: 1 });

    expect(result).toBeDefined();
    expect(result?.totalEmployees).toBe(10);
    expect(result?.evaluatedCount).toBe(8);
    expect(result?.averageScore).toBe(75.5);
  });
});

describe("Employee Router", () => {
  it("should list all employees", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.employee.list();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("João Silva");
    expect(result[1].name).toBe("Maria Santos");
  });

  it("should get employee by id", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.employee.getById({ id: 1 });

    expect(result).toBeDefined();
    expect(result?.name).toBe("João Silva");
    expect(result?.level).toBe("N2");
  });
});

describe("Evaluation Router", () => {
  it("should list evaluations by cycle", async () => {
    const ctx = createLeaderContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.evaluation.listByCycle({ cycleId: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].totalScore).toBe(88);
    expect(result[0].isOfficial).toBe(true);
  });
});

describe("Flag Router", () => {
  it("should list all flags", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.flag.list();

    expect(result).toHaveLength(3);
    expect(result[0].level).toBe(1);
    expect(result[0].bonusPercentage).toBe(15);
  });

  it("should get current flag based on revenue", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.flag.getCurrent({ revenue: 8000000 });

    expect(result).toBeDefined();
    expect(result?.level).toBe(2);
    expect(result?.bonusPercentage).toBe(30);
  });
});

describe("Indicator Router", () => {
  it("should list all active indicators", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.indicator.list();

    expect(result).toHaveLength(5);
    expect(result.map(i => i.code)).toContain("punctuality");
    expect(result.map(i => i.code)).toContain("quality");
  });
});

describe("Promotion Router", () => {
  it("should get promotion requirements", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.promotion.getRequirements();

    expect(result).toHaveLength(4);
    expect(result[0].fromLevel).toBe("N1");
    expect(result[0].toLevel).toBe("N2");
    expect(result[0].minScore).toBe(70);
  });
});

describe("Role-based Access Control", () => {
  it("should allow admin to access employee list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.employee.list();
    expect(result).toBeDefined();
  });

  it("should allow leader to access evaluations", async () => {
    const ctx = createLeaderContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.evaluation.listByCycle({ cycleId: 1 });
    expect(result).toBeDefined();
  });

  it("should allow employee to access cycle info", async () => {
    const ctx = createEmployeeContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cycle.getCurrent();
    expect(result).toBeDefined();
  });
});
