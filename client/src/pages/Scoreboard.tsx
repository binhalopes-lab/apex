import { useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Trophy, Medal, Download, Printer, Flag,
  TrendingUp, TrendingDown, Minus, AlertTriangle
} from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Nomes dos indicadores
const INDICATOR_NAMES = {
  punctuality: "Pontualidade",
  organization: "Organização",
  productivity: "Produtividade",
  quality: "Qualidade",
  safety: "Segurança"
};

export default function Scoreboard() {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: currentCycle, isLoading: cycleLoading } = trpc.cycle.getCurrent.useQuery();
  const { data: employees } = trpc.employee.list.useQuery({ status: "active" });
  const { data: evaluations, isLoading: evalLoading } = trpc.evaluation.listByCycle.useQuery(
    { cycleId: currentCycle?.id || 0 },
    { enabled: !!currentCycle?.id }
  );
  const { data: revenueStats } = trpc.revenue.getCycleTotal.useQuery(
    { cycleId: currentCycle?.id || 0 },
    { enabled: !!currentCycle?.id }
  );

  const isLoading = cycleLoading || evalLoading;

  // Calculate average scores per employee including indicator averages
  const employeeScores = employees?.map(emp => {
    const empEvaluations = evaluations?.filter(e => e.employeeId === emp.id) || [];
    
    if (empEvaluations.length === 0) {
      return {
        ...emp,
        averageScore: null,
        evaluationCount: 0,
        lateCount: 0,
        isBlocked: false,
        trend: "none" as const,
        indicatorAverages: {
          punctuality: null as number | null,
          organization: null as number | null,
          productivity: null as number | null,
          quality: null as number | null,
          safety: null as number | null,
        }
      };
    }

    // Calculate average of all evaluations
    const totalScore = empEvaluations.reduce((sum, e) => sum + e.totalScore, 0);
    const averageScore = Math.round(totalScore / empEvaluations.length);
    const totalLates = empEvaluations.reduce((sum, e) => sum + e.lateCount, 0);
    const isBlocked = totalLates >= 3 || averageScore < 70;

    // Calculate indicator averages
    const indicatorAverages = {
      punctuality: Math.round(empEvaluations.reduce((sum, e) => sum + e.punctuality, 0) / empEvaluations.length),
      organization: Math.round(empEvaluations.reduce((sum, e) => sum + e.organization, 0) / empEvaluations.length),
      productivity: Math.round(empEvaluations.reduce((sum, e) => sum + e.productivity, 0) / empEvaluations.length),
      quality: Math.round(empEvaluations.reduce((sum, e) => sum + e.quality, 0) / empEvaluations.length),
      safety: Math.round(empEvaluations.reduce((sum, e) => sum + e.safety, 0) / empEvaluations.length),
    };

    // Determine trend based on last 2 evaluations
    let trend: "up" | "down" | "none" = "none";
    if (empEvaluations.length >= 2) {
      const sorted = [...empEvaluations].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      if (sorted[0].totalScore > sorted[1].totalScore) trend = "up";
      else if (sorted[0].totalScore < sorted[1].totalScore) trend = "down";
    }

    return {
      ...emp,
      averageScore,
      evaluationCount: empEvaluations.length,
      lateCount: totalLates,
      isBlocked,
      trend,
      indicatorAverages,
    };
  }).sort((a, b) => {
    // Sort by average score descending, null values at the end
    if (a.averageScore === null) return 1;
    if (b.averageScore === null) return -1;
    return b.averageScore - a.averageScore;
  }) || [];

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão");
      return;
    }

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
        h1 { text-align: center; color: #333; margin-bottom: 5px; font-size: 18px; }
        h2 { text-align: center; color: #666; font-weight: normal; margin-top: 0; font-size: 14px; }
        .header-info { text-align: center; margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
        th { background: #f0f0f0; font-weight: bold; font-size: 10px; }
        .rank { font-weight: bold; }
        .gold { color: #FFD700; }
        .silver { color: #C0C0C0; }
        .bronze { color: #CD7F32; }
        .score { font-weight: bold; font-size: 1.1em; }
        .score-high { color: #22c55e; }
        .score-medium { color: #eab308; }
        .score-low { color: #ef4444; }
        .blocked { color: #ef4444; font-weight: bold; }
        .level { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
        .level-n1 { background: #e5e7eb; }
        .level-n2 { background: #dbeafe; color: #1d4ed8; }
        .level-n3 { background: #dcfce7; color: #16a34a; }
        .level-n4 { background: #fef3c7; color: #d97706; }
        .level-n5 { background: #fce7f3; color: #db2777; }
        .indicator { font-size: 10px; }
        .indicator-low { color: #ef4444; font-weight: bold; }
        .indicator-medium { color: #eab308; }
        .indicator-high { color: #22c55e; }
        .footer { margin-top: 20px; text-align: center; color: #666; font-size: 10px; }
        .legend { margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px; font-size: 10px; }
        .legend-title { font-weight: bold; margin-bottom: 5px; }
        @media print { 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: landscape; margin: 10mm; }
        }
      </style>
    `;

    const flagInfo = revenueStats?.currentFlag 
      ? `Bandeira ${revenueStats.currentFlag.level} (${revenueStats.currentFlag.bonusPercentage}%)`
      : "Nenhuma bandeira atingida";

    const getIndicatorClass = (value: number | null) => {
      if (value === null) return '';
      if (value >= 16) return 'indicator-high';
      if (value >= 12) return 'indicator-medium';
      return 'indicator-low';
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Placar APEX - ${MONTH_NAMES[(currentCycle?.month || 1) - 1]}/${currentCycle?.year}</title>
          ${styles}
        </head>
        <body>
          <h1>🏆 PLACAR APEX - ANÁLISE DE DESEMPENHO</h1>
          <h2>${MONTH_NAMES[(currentCycle?.month || 1) - 1]}/${currentCycle?.year}</h2>
          
          <div class="header-info">
            <strong>Faturamento:</strong> ${formatCurrency(revenueStats?.total || 0)} | 
            <strong>Bandeira:</strong> ${flagInfo} |
            <strong>Avaliados:</strong> ${employeeScores.filter(e => e.averageScore !== null).length}/${employeeScores.length}
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width: 40px;">Pos.</th>
                <th rowspan="2" style="text-align: left;">Colaborador</th>
                <th rowspan="2" style="width: 50px;">Nível</th>
                <th colspan="5" style="background: #e0e7ff;">Médias por Indicador (0-20)</th>
                <th rowspan="2" style="width: 60px;">Média<br>Geral</th>
                <th rowspan="2" style="width: 50px;">Aval.</th>
                <th rowspan="2" style="width: 50px;">Atrasos</th>
                <th rowspan="2" style="width: 70px;">Status</th>
              </tr>
              <tr>
                <th style="background: #e0e7ff; width: 55px;">Pont.</th>
                <th style="background: #e0e7ff; width: 55px;">Org.</th>
                <th style="background: #e0e7ff; width: 55px;">Prod.</th>
                <th style="background: #e0e7ff; width: 55px;">Qual.</th>
                <th style="background: #e0e7ff; width: 55px;">Seg.</th>
              </tr>
            </thead>
            <tbody>
              ${employeeScores.map((emp, index) => {
                const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
                const scoreClass = emp.averageScore === null ? '' : 
                  emp.averageScore >= 85 ? 'score-high' : 
                  emp.averageScore >= 70 ? 'score-medium' : 'score-low';
                const levelClass = `level-${emp.level.toLowerCase()}`;
                
                return `
                  <tr>
                    <td class="rank ${rankClass}">${index + 1}º</td>
                    <td style="text-align: left;">${emp.name}</td>
                    <td><span class="level ${levelClass}">${emp.level}</span></td>
                    <td class="indicator ${getIndicatorClass(emp.indicatorAverages.punctuality)}">${emp.indicatorAverages.punctuality ?? '-'}</td>
                    <td class="indicator ${getIndicatorClass(emp.indicatorAverages.organization)}">${emp.indicatorAverages.organization ?? '-'}</td>
                    <td class="indicator ${getIndicatorClass(emp.indicatorAverages.productivity)}">${emp.indicatorAverages.productivity ?? '-'}</td>
                    <td class="indicator ${getIndicatorClass(emp.indicatorAverages.quality)}">${emp.indicatorAverages.quality ?? '-'}</td>
                    <td class="indicator ${getIndicatorClass(emp.indicatorAverages.safety)}">${emp.indicatorAverages.safety ?? '-'}</td>
                    <td class="score ${scoreClass}">${emp.averageScore !== null ? emp.averageScore : '-'}</td>
                    <td>${emp.evaluationCount}</td>
                    <td>${emp.lateCount}</td>
                    <td>${emp.isBlocked ? '<span class="blocked">BLOQ.</span>' : emp.averageScore !== null ? '✓' : '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="legend">
            <div class="legend-title">Legenda dos Indicadores:</div>
            <div>
              <strong>Pont.</strong> = Pontualidade | 
              <strong>Org.</strong> = Organização (5S) | 
              <strong>Prod.</strong> = Produtividade | 
              <strong>Qual.</strong> = Qualidade | 
              <strong>Seg.</strong> = Segurança
            </div>
            <div style="margin-top: 5px;">
              <span class="indicator-high">■ Verde (16-20):</span> Excelente | 
              <span class="indicator-medium">■ Amarelo (12-15):</span> Bom | 
              <span class="indicator-low">■ Vermelho (0-11):</span> Precisa Melhorar
            </div>
          </div>

          <div class="footer">
            <p>Gerado em ${new Date().toLocaleString('pt-BR')} | APEX Estruturas Metálicas</p>
            <p><em>Agilidade • Qualidade • Segurança</em></p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  const getIndicatorColor = (value: number | null) => {
    if (value === null) return "text-muted-foreground";
    if (value >= 16) return "text-green-600 font-semibold";
    if (value >= 12) return "text-yellow-600";
    return "text-red-600 font-semibold";
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-7 w-7 md:h-8 md:w-8 text-yellow-500" />
            Placar Geral
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {MONTH_NAMES[(currentCycle?.month || 1) - 1]} / {currentCycle?.year} • 
            A média de todas as avaliações é a nota oficial
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir /</span> PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-2 md:gap-3">
              <Flag className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Bandeira</p>
                {revenueStats?.currentFlag ? (
                  <p className="text-lg md:text-2xl font-bold">
                    Nível {revenueStats.currentFlag.level}
                  </p>
                ) : (
                  <p className="text-sm md:text-lg text-muted-foreground">Nenhuma</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="text-center">
              <p className="text-xs md:text-sm text-muted-foreground">Faturamento</p>
              <p className="text-lg md:text-2xl font-bold">{formatCurrency(revenueStats?.total || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="text-center">
              <p className="text-xs md:text-sm text-muted-foreground">Avaliados</p>
              <p className="text-lg md:text-2xl font-bold">
                {employeeScores.filter(e => e.averageScore !== null).length}
                <span className="text-sm font-normal text-muted-foreground">/{employeeScores.length}</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="text-center">
              <p className="text-xs md:text-sm text-muted-foreground">Elegíveis</p>
              <p className="text-lg md:text-2xl font-bold text-green-600">
                {employeeScores.filter(e => !e.isBlocked && e.averageScore !== null).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scoreboard Table */}
      <Card ref={printRef}>
        <CardHeader>
          <CardTitle>Ranking de Desempenho</CardTitle>
          <CardDescription>
            Médias por indicador para análise vertical - identifique onde cada colaborador precisa melhorar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Pos.</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="w-16 text-center">Nível</TableHead>
                  <TableHead className="w-14 text-center text-xs" title="Pontualidade">Pont.</TableHead>
                  <TableHead className="w-14 text-center text-xs" title="Organização">Org.</TableHead>
                  <TableHead className="w-14 text-center text-xs" title="Produtividade">Prod.</TableHead>
                  <TableHead className="w-14 text-center text-xs" title="Qualidade">Qual.</TableHead>
                  <TableHead className="w-14 text-center text-xs" title="Segurança">Seg.</TableHead>
                  <TableHead className="w-20 text-center">Média</TableHead>
                  <TableHead className="w-16 text-center">Aval.</TableHead>
                  <TableHead className="w-20 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeScores.map((emp, index) => (
                  <TableRow key={emp.id} className={emp.isBlocked ? "bg-red-50" : ""}>
                    <TableCell className="text-center font-bold">
                      {index === 0 && <span className="text-yellow-500">🥇</span>}
                      {index === 1 && <span className="text-gray-400">🥈</span>}
                      {index === 2 && <span className="text-amber-600">🥉</span>}
                      {index > 2 && `${index + 1}º`}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {emp.name}
                        {emp.trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {emp.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {emp.level}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-center ${getIndicatorColor(emp.indicatorAverages.punctuality)}`}>
                      {emp.indicatorAverages.punctuality ?? "-"}
                    </TableCell>
                    <TableCell className={`text-center ${getIndicatorColor(emp.indicatorAverages.organization)}`}>
                      {emp.indicatorAverages.organization ?? "-"}
                    </TableCell>
                    <TableCell className={`text-center ${getIndicatorColor(emp.indicatorAverages.productivity)}`}>
                      {emp.indicatorAverages.productivity ?? "-"}
                    </TableCell>
                    <TableCell className={`text-center ${getIndicatorColor(emp.indicatorAverages.quality)}`}>
                      {emp.indicatorAverages.quality ?? "-"}
                    </TableCell>
                    <TableCell className={`text-center ${getIndicatorColor(emp.indicatorAverages.safety)}`}>
                      {emp.indicatorAverages.safety ?? "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {emp.averageScore !== null ? (
                        <span className={`text-lg font-bold ${
                          emp.averageScore >= 85 ? "text-green-600" :
                          emp.averageScore >= 70 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {emp.averageScore}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {emp.evaluationCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {emp.isBlocked ? (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Bloq.
                        </Badge>
                      ) : emp.averageScore !== null ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          Elegível
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Pendente</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Legenda dos Indicadores (0-20 pontos cada):</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <div><strong>Pont.</strong> = Pontualidade</div>
              <div><strong>Org.</strong> = Organização (5S)</div>
              <div><strong>Prod.</strong> = Produtividade</div>
              <div><strong>Qual.</strong> = Qualidade</div>
              <div><strong>Seg.</strong> = Segurança</div>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs">
              <span><span className="text-green-600 font-semibold">■ 16-20:</span> Excelente</span>
              <span><span className="text-yellow-600">■ 12-15:</span> Bom</span>
              <span><span className="text-red-600 font-semibold">■ 0-11:</span> Precisa Melhorar</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
