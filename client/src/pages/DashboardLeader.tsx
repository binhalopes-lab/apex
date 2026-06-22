import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { 
  ClipboardCheck, Users, AlertTriangle, Clock,
  CheckCircle, ArrowRight, Flag, TrendingUp
} from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function DashboardLeader() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

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
  const { data: revenueStats } = trpc.revenue.getCycleTotal.useQuery(
    { cycleId: currentCycle?.id || 0 },
    { enabled: !!currentCycle?.id }
  );

  const isLoading = cycleLoading || statsLoading;

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

  // Calculate leader-specific stats
  const officialEvaluations = evaluations?.filter(e => e.isOfficial) || [];
  const evaluatedEmployeeIds = new Set(officialEvaluations.map(e => e.employeeId));
  const pendingEmployees = employees?.filter(e => !evaluatedEmployeeIds.has(e.id)) || [];
  const employeesWithMultipleLates = officialEvaluations.filter(e => e.lateCount >= 2);
  const employeesInBerlinda = officialEvaluations.filter(e => e.totalScore < 50);
  const employeesNeedingAttention = officialEvaluations.filter(e => e.totalScore < 70 || e.lateCount >= 2);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Tático</h1>
          <p className="text-muted-foreground">
            Ciclo: {currentCycle?.month}/{currentCycle?.year} • 
            Status: <Badge variant={currentCycle?.status === "active" ? "default" : "secondary"}>
              {currentCycle?.status === "active" ? "Ativo" : "Encerrado"}
            </Badge>
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/evaluate")}>
          <ClipboardCheck className="h-4 w-4" />
          Avaliar Agora
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Evaluated */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avaliados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{officialEvaluations.length}</div>
            <Progress 
              value={(officialEvaluations.length / (employees?.length || 1)) * 100} 
              className="mt-2 h-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              de {employees?.length || 0} colaboradores
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className={pendingEmployees.length > 0 ? "border-orange-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sem Avaliação</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingEmployees.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              precisam ser avaliados
            </p>
          </CardContent>
        </Card>

        {/* With 2+ Lates */}
        <Card className={employeesWithMultipleLates.length > 0 ? "border-yellow-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">2+ Atrasos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{employeesWithMultipleLates.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              risco de perder premiação
            </p>
          </CardContent>
        </Card>

        {/* In Berlinda */}
        <Card className={employeesInBerlinda.length > 0 ? "border-red-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Berlinda</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{employeesInBerlinda.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              nota abaixo de 50
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Flag Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Status da Bandeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {revenueStats?.currentFlag ? (
              <div className="flex items-center gap-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold
                  ${revenueStats.currentFlag.level === 1 ? 'bg-green-500' :
                    revenueStats.currentFlag.level === 2 ? 'bg-blue-500' :
                    revenueStats.currentFlag.level === 3 ? 'bg-indigo-500' :
                    revenueStats.currentFlag.level === 4 ? 'bg-purple-500' : 'bg-pink-500'}`}>
                  {revenueStats.currentFlag.level}
                </div>
                <div>
                  <p className="text-lg font-semibold">Bandeira {revenueStats.currentFlag.level}</p>
                  <p className="text-muted-foreground">{revenueStats.currentFlag.bonusPercentage}% de premiação</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-200 text-gray-500 text-2xl font-bold">
                  0
                </div>
                <div>
                  <p className="text-lg font-semibold text-muted-foreground">Nenhuma bandeira</p>
                  <p className="text-muted-foreground">Meta não atingida</p>
                </div>
              </div>
            )}
            
            <div className="flex-1 px-6 border-l">
              <p className="text-sm text-muted-foreground">Faturamento do mês</p>
              <p className="text-2xl font-bold">{formatCurrency(revenueStats?.total || 0)}</p>
            </div>

            {revenueStats?.nextFlag && (
              <div className="px-6 border-l">
                <p className="text-sm text-muted-foreground">Para próxima bandeira</p>
                <p className="text-lg font-semibold text-orange-600">
                  Faltam {formatCurrency(revenueStats.amountToNextFlag)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attention List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Evaluations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Aguardando Avaliação
            </CardTitle>
            <CardDescription>
              Clique para avaliar diretamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingEmployees.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-muted-foreground">Todos avaliados!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingEmployees.slice(0, 5).map((emp) => (
                  <div 
                    key={emp.id} 
                    className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer"
                    onClick={() => navigate(`/evaluate?employee=${emp.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`level-badge level-${emp.level.toLowerCase()}`}>
                        {emp.level}
                      </div>
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-sm text-muted-foreground">{emp.position || "Colaborador"}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
                {pendingEmployees.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{pendingEmployees.length - 5} mais
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attention Needed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Atenção Imediata
            </CardTitle>
            <CardDescription>
              Colaboradores com nota baixa ou atrasos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employeesNeedingAttention.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-muted-foreground">Nenhum caso de atenção</p>
              </div>
            ) : (
              <div className="space-y-2">
                {employeesNeedingAttention.slice(0, 5).map((eval_) => {
                  const emp = employees?.find(e => e.id === eval_.employeeId);
                  const issues = [];
                  if (eval_.totalScore < 50) issues.push("Berlinda");
                  else if (eval_.totalScore < 70) issues.push("Nota baixa");
                  if (eval_.lateCount >= 3) issues.push("3+ atrasos");
                  else if (eval_.lateCount >= 2) issues.push("2 atrasos");

                  return (
                    <div 
                      key={eval_.id} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        eval_.totalScore < 50 ? 'bg-red-50' : 'bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`level-badge level-${emp?.level.toLowerCase()}`}>
                          {emp?.level}
                        </div>
                        <div>
                          <p className="font-medium">{emp?.name}</p>
                          <div className="flex gap-1">
                            {issues.map((issue, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className={`text-xl font-bold ${
                        eval_.totalScore < 50 ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {eval_.totalScore}
                      </div>
                    </div>
                  );
                })}
                {employeesNeedingAttention.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{employeesNeedingAttention.length - 5} mais
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/evaluate")} className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Avaliar Colaborador
            </Button>
            <Button variant="outline" onClick={() => navigate("/evaluations")} className="gap-2">
              <Users className="h-4 w-4" />
              Ver Todas Avaliações
            </Button>
            <Button variant="outline" onClick={() => navigate("/employees")} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Gestão de Equipe
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
