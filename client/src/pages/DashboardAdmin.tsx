import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, Users, TrendingUp, AlertTriangle, 
  Award, Flag, CheckCircle, XCircle, Clock,
  ArrowUpRight, Target
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function getFlagColor(level: number): string {
  const colors: Record<number, string> = {
    1: "bg-green-500",
    2: "bg-blue-500",
    3: "bg-indigo-500",
    4: "bg-purple-500",
    5: "bg-pink-500",
  };
  return colors[level] || "bg-gray-500";
}

export default function DashboardAdmin() {
  const { user } = useAuth();
  const { data: currentCycle, isLoading: cycleLoading } = trpc.cycle.getCurrent.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.cycle.getStats.useQuery(
    { cycleId: currentCycle?.id || 0 },
    { enabled: !!currentCycle?.id }
  );
  const { data: employees } = trpc.employee.list.useQuery({ status: "active" });
  const { data: evaluations } = trpc.evaluation.listByCycle.useQuery(
    { cycleId: currentCycle?.id || 0 },
    { enabled: !!currentCycle?.id }
  );
  const { data: allAverages } = trpc.evaluation.getAllAverages.useQuery(
    { cycleId: currentCycle?.id || 0 },
    { enabled: !!currentCycle?.id }
  );
  const { data: flags } = trpc.flag.list.useQuery();

  const isLoading = cycleLoading || statsLoading;

  // Use averages for chart data (nota oficial = média)
  const evaluatedEmployees = allAverages?.filter(e => e.averageScore !== null) || [];
  
  const chartData = [
    { range: "85-100", count: evaluatedEmployees.filter(e => e.averageScore! >= 85).length, fill: "#22c55e" },
    { range: "70-84", count: evaluatedEmployees.filter(e => e.averageScore! >= 70 && e.averageScore! < 85).length, fill: "#3b82f6" },
    { range: "50-69", count: evaluatedEmployees.filter(e => e.averageScore! >= 50 && e.averageScore! < 70).length, fill: "#eab308" },
    { range: "<50", count: evaluatedEmployees.filter(e => e.averageScore! < 50).length, fill: "#ef4444" },
  ];

  // Top 5 by average score
  const topPerformers = evaluatedEmployees
    .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
    .slice(0, 5);

  // Bottom 5 by average score
  const bottomPerformers = evaluatedEmployees
    .sort((a, b) => (a.averageScore || 0) - (b.averageScore || 0))
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const currentFlag = stats?.currentFlag;
  const nextFlag = stats?.nextFlag;
  const progressToNextFlag = nextFlag && stats?.totalRevenue 
    ? Math.min(100, (stats.totalRevenue / nextFlag.minRevenue) * 100)
    : 100;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard Estratégico</h1>
          <p className="text-muted-foreground">
            Ciclo: {currentCycle?.month}/{currentCycle?.year} • 
            Status: <Badge variant={currentCycle?.status === "active" ? "default" : "secondary"}>
              {currentCycle?.status === "active" ? "Ativo" : "Encerrado"}
            </Badge>
          </p>
        </div>
        {user?.role === "admin" && currentCycle?.status === "active" && (
          <Button variant="destructive" className="gap-2">
            <Flag className="h-4 w-4" />
            Encerrar Ciclo
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
            <div className="flex items-center gap-2 mt-2">
              {currentFlag && (
                <Badge className={`${getFlagColor(currentFlag.level)} text-white`}>
                  Bandeira {currentFlag.level}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {currentFlag?.bonusPercentage}% de premiação
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Próxima Bandeira */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próxima Bandeira</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextFlag ? (
              <>
                <div className="text-2xl font-bold">
                  Faltam {formatCurrency(stats?.amountToNextFlag || 0)}
                </div>
                <Progress value={progressToNextFlag} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  Para Bandeira {nextFlag.level} ({nextFlag.bonusPercentage}%)
                </p>
              </>
            ) : (
              <div className="text-lg font-medium text-green-600">
                Bandeira máxima atingida!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Elegíveis */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Elegíveis à Premiação</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.eligibleCount || 0}</div>
            <p className="text-sm text-muted-foreground">
              de {stats?.totalEmployees || 0} colaboradores
            </p>
            <div className="text-sm text-muted-foreground mt-1">
              Custo estimado: {formatCurrency(stats?.estimatedBonusCost || 0)}
            </div>
          </CardContent>
        </Card>

        {/* Bloqueados / Berlinda */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atenção Necessária</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats?.blockedCount || 0}</div>
                <p className="text-xs text-muted-foreground">Bloqueados</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats?.berlindaCount || 0}</div>
                <p className="text-xs text-muted-foreground">Em Berlinda</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats?.readyForPromotionCount || 0}</div>
                <p className="text-xs text-muted-foreground">Prontos p/ Promoção</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Notas</CardTitle>
            <CardDescription>Avaliações oficiais do ciclo atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Flag Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Metas de Bandeiras</CardTitle>
            <CardDescription>Faixas de faturamento e premiação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {flags?.map((flag) => {
                const isAchieved = (stats?.totalRevenue || 0) >= flag.minRevenue;
                const isCurrent = currentFlag?.level === flag.level;
                return (
                  <div key={flag.id} className={`flex items-center gap-4 p-3 rounded-lg ${isCurrent ? 'bg-primary/10 border border-primary' : 'bg-muted/50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAchieved ? getFlagColor(flag.level) : 'bg-gray-200'} text-white font-bold`}>
                      {flag.level}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Bandeira {flag.level}</span>
                        <span className="text-sm text-muted-foreground">{flag.bonusPercentage}%</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Meta: {formatCurrency(flag.minRevenue)}
                      </div>
                    </div>
                    {isAchieved && <CheckCircle className="h-5 w-5 text-green-500" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top/Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top 5 Melhores Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma avaliação ainda</p>
              ) : (
                topPerformers.map((item, index) => (
                  <div key={item.employee.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center font-bold text-yellow-700">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.employee.name}</p>
                      <p className="text-sm text-muted-foreground">{item.employee.level} • {item.evaluationCount} avaliações</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{item.averageScore}</p>
                      <p className="text-xs text-muted-foreground">média</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bottom 5 / Berlinda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Atenção: Menores Notas / Berlinda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottomPerformers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma avaliação ainda</p>
              ) : (
                bottomPerformers.map((item, index) => {
                  const inBerlinda = (item.averageScore || 0) < 50;
                  return (
                    <div key={item.employee.id} className={`flex items-center gap-4 p-2 rounded-lg ${inBerlinda ? 'bg-red-50' : 'hover:bg-muted/50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${inBerlinda ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.employee.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{item.employee.level} • {item.evaluationCount} avaliações</span>
                          {inBerlinda && <Badge variant="destructive" className="text-xs">Berlinda</Badge>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${(item.averageScore || 0) < 50 ? 'text-red-600' : (item.averageScore || 0) < 70 ? 'text-yellow-600' : 'text-foreground'}`}>
                          {item.averageScore}
                        </p>
                        <p className="text-xs text-muted-foreground">média</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avaliações Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Status das Avaliações
          </CardTitle>
          <CardDescription>
            {stats?.evaluatedCount || 0} de {stats?.totalEmployees || 0} colaboradores avaliados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress 
            value={stats?.totalEmployees ? ((stats?.evaluatedCount || 0) / stats.totalEmployees) * 100 : 0} 
            className="h-3"
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{stats?.evaluatedCount || 0} avaliados</span>
            <span>{stats?.pendingEvaluations || 0} pendentes</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
