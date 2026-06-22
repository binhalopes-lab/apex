import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Award, TrendingUp, Flag, Target, 
  CheckCircle, XCircle, Clock, AlertTriangle,
  Star, ArrowUpRight, BarChart3
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

const INDICATORS = [
  { key: "punctuality", label: "Pontualidade" },
  { key: "organization", label: "5S" },
  { key: "productivity", label: "Produtividade" },
  { key: "quality", label: "Qualidade" },
  { key: "safety", label: "Segurança" },
];

export default function EmployeePanel() {
  const { user } = useAuth();
  
  const { data: employee, isLoading: empLoading } = trpc.employee.getMyProfile.useQuery();
  const { data: currentCycle } = trpc.cycle.getCurrent.useQuery();
  
  // Get ALL evaluations for this employee in this cycle (not just official)
  const { data: allEvaluations } = trpc.evaluation.listByEmployee.useQuery(
    { employeeId: employee?.id || 0, cycleId: currentCycle?.id || 0 },
    { enabled: !!employee?.id && !!currentCycle?.id }
  );
  
  const { data: history } = trpc.employee.getEvaluationHistory.useQuery(
    { employeeId: employee?.id || 0, limit: 6 },
    { enabled: !!employee?.id }
  );
  const { data: eligibility } = trpc.promotion.checkEligibility.useQuery(
    { employeeId: employee?.id || 0 },
    { enabled: !!employee?.id }
  );
  const { data: revenueStats } = trpc.revenue.getCycleTotal.useQuery(
    { cycleId: currentCycle?.id || 0 },
    { enabled: !!currentCycle?.id }
  );
  const { data: incidents } = trpc.incident.listByEmployee.useQuery(
    { employeeId: employee?.id || 0, cycleId: currentCycle?.id },
    { enabled: !!employee?.id && !!currentCycle?.id }
  );

  if (empLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Perfil não encontrado</h2>
            <p className="text-muted-foreground">
              Seu perfil de colaborador ainda não foi vinculado. Entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate AVERAGE of all evaluations in the cycle
  const evaluationCount = allEvaluations?.length || 0;
  const averageScore = evaluationCount > 0
    ? Math.round(allEvaluations!.reduce((sum, e) => sum + e.totalScore, 0) / evaluationCount)
    : null;
  
  // Calculate average for each indicator
  const averageIndicators = INDICATORS.reduce((acc, ind) => {
    if (evaluationCount > 0) {
      acc[ind.key] = Math.round(
        allEvaluations!.reduce((sum, e) => sum + (e[ind.key as keyof typeof e] as number), 0) / evaluationCount
      );
    } else {
      acc[ind.key] = 0;
    }
    return acc;
  }, {} as Record<string, number>);

  // Total late count from all evaluations
  const totalLateCount = allEvaluations?.reduce((sum, e) => sum + e.lateCount, 0) || 0;

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreStatus = () => {
    if (averageScore === null) return { label: "Sem avaliação", color: "bg-gray-100 text-gray-800", icon: Clock };
    if (totalLateCount >= 3) return { label: "Bloqueado", color: "bg-red-100 text-red-800", icon: XCircle };
    if (averageScore >= 85) return { label: "Excelente", color: "bg-green-100 text-green-800", icon: Star };
    if (averageScore >= 70) return { label: "Elegível", color: "bg-blue-100 text-blue-800", icon: CheckCircle };
    if (averageScore >= 50) return { label: "Atenção", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle };
    return { label: "Berlinda", color: "bg-red-100 text-red-800", icon: XCircle };
  };

  const status = getScoreStatus();
  const StatusIcon = status.icon;

  // Prepare chart data
  const historyChartData = history?.map(h => ({
    month: `${h.cycle.month}/${h.cycle.year}`,
    score: h.evaluation.totalScore,
  })).reverse() || [];

  const radarData = INDICATORS.map(ind => ({
    indicator: ind.label,
    score: averageIndicators[ind.key],
    fullMark: 20,
  }));

  // Calculate estimated bonus
  const hasBlockingIncident = incidents?.some(i => i.blocksBonus);
  const isEligible = averageScore !== null && averageScore >= 70 && totalLateCount < 3 && !hasBlockingIncident;
  
  const estimatedBonus = isEligible && revenueStats?.currentFlag
    ? Math.round((employee.baseSalary || 0) * (revenueStats.currentFlag.bonusPercentage / 100))
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meu Painel</h1>
          <p className="text-muted-foreground">
            Ciclo: {currentCycle?.month}/{currentCycle?.year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`level-badge level-${employee.level.toLowerCase()}`}>
            {employee.level}
          </div>
          <div className="text-right">
            <p className="font-semibold">{employee.name}</p>
            <p className="text-sm text-muted-foreground">{employee.position || "Colaborador"}</p>
          </div>
        </div>
      </div>

      {/* Evaluation Count Info */}
      {evaluationCount > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <p className="text-blue-800">
                <strong>{evaluationCount}</strong> avaliação(ões) neste mês. A nota exibida é a <strong>média</strong> de todas as avaliações.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Score Card */}
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <p className="text-sm text-muted-foreground mb-2">Média do Mês</p>
            <div className={`text-7xl font-bold ${averageScore !== null ? getScoreColor(averageScore) : 'text-muted-foreground'}`}>
              {averageScore ?? "-"}
            </div>
            <p className="text-muted-foreground">/ 100 pontos</p>
            <Badge className={`mt-4 ${status.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <div className="p-6">
            <h3 className="font-semibold mb-4">Indicadores (Média)</h3>
            <div className="space-y-3">
              {INDICATORS.map(({ key, label }) => {
                const score = averageIndicators[key];
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{label}</span>
                      <span className="font-medium">{score}/20</span>
                    </div>
                    <Progress value={(score / 20) * 100} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Eligibility */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Situação da Premiação</CardTitle>
          </CardHeader>
          <CardContent>
            {isEligible ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Elegível</p>
                  <p className="text-sm text-muted-foreground">
                    Estimativa: {formatCurrency(estimatedBonus)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Não Elegível</p>
                  <p className="text-sm text-muted-foreground">
                    {totalLateCount >= 3 ? `${totalLateCount} atrasos` : 
                     averageScore !== null && averageScore < 70 ? "Nota < 70" : 
                     hasBlockingIncident ? "Ocorrência bloqueante" : "Sem avaliação"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Late Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atrasos no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className={`h-6 w-6 ${totalLateCount >= 3 ? 'text-red-500' : totalLateCount >= 2 ? 'text-yellow-500' : 'text-green-500'}`} />
              <div>
                <p className="text-2xl font-bold">{totalLateCount}</p>
                <p className="text-sm text-muted-foreground">
                  {totalLateCount >= 3 ? "Premiação bloqueada" : `Limite: 3`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promotion Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Promoção</CardTitle>
          </CardHeader>
          <CardContent>
            {eligibility?.eligible ? (
              <div className="flex items-center gap-2 text-green-600">
                <ArrowUpRight className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Pronto para promoção!</p>
                  <p className="text-sm text-muted-foreground">
                    {eligibility.requirement?.consecutiveMonths || 2} meses consecutivos
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Em progresso</p>
                  <p className="text-sm">
                    Meta: {eligibility?.requirement?.minScore || 70} pts por 2 meses
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* History Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Histórico de Notas
            </CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {historyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem histórico disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Perfil de Desempenho
            </CardTitle>
            <CardDescription>Média dos indicadores</CardDescription>
          </CardHeader>
          <CardContent>
            {evaluationCount > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="indicator" fontSize={11} />
                  <PolarRadiusAxis domain={[0, 20]} fontSize={10} />
                  <Radar
                    name="Nota"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Aguardando avaliação
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Flag Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Bandeira do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Faturamento Atual</p>
              <p className="text-2xl font-bold">{formatCurrency(revenueStats?.total || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Bandeira Atingida</p>
              {revenueStats?.currentFlag ? (
                <div className="flex items-center gap-2">
                  <Badge className="text-lg px-3 py-1">
                    Nível {revenueStats.currentFlag.level}
                  </Badge>
                  <span className="text-green-600 font-bold">
                    +{revenueStats.currentFlag.bonusPercentage}%
                  </span>
                </div>
              ) : (
                <p className="text-lg text-muted-foreground">Nenhuma</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents */}
      {incidents && incidents.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              Ocorrências no Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {incidents.map((incident) => (
                <div key={incident.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <Badge variant={incident.blocksBonus ? "destructive" : "secondary"}>
                      {incident.type === "rework" ? "Retrabalho" :
                       incident.type === "warning" ? "Advertência" :
                       incident.type === "accident" ? "Acidente" :
                       incident.type === "absence" ? "Falta" : "Outro"}
                    </Badge>
                    <p className="text-sm mt-1">{incident.description}</p>
                  </div>
                  {incident.blocksBonus && (
                    <Badge variant="destructive">Bloqueia Premiação</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
