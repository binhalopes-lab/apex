import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  ClipboardCheck, Eye, Clock, AlertTriangle, Search, Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const INDICATORS = [
  { key: "punctuality", label: "Pontualidade" },
  { key: "organization", label: "Organização (5S)" },
  { key: "productivity", label: "Produtividade" },
  { key: "quality", label: "Qualidade" },
  { key: "safety", label: "Segurança" },
];

export default function Evaluations() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "evaluated" | "pending">("all");
  const [selectedEvaluation, setSelectedEvaluation] = useState<number | null>(null);

  const { data: currentCycle } = trpc.cycle.getCurrent.useQuery();
  const { data: allAverages, isLoading } = trpc.evaluation.getAllAverages.useQuery(
    { cycleId: currentCycle?.id || 0 },
    { enabled: !!currentCycle?.id }
  );
  const { data: employees } = trpc.employee.list.useQuery({ status: "active" });
  const { data: selectedEval } = trpc.evaluation.getById.useQuery(
    { id: selectedEvaluation || 0 },
    { enabled: !!selectedEvaluation }
  );

  const getEmployee = (employeeId: number) => employees?.find(e => e.id === employeeId);

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreStatus = (score: number | null, lateCount: number) => {
    if (score === null) return { label: "Pendente", color: "bg-gray-100 text-gray-800" };
    if (lateCount >= 3) return { label: "Bloqueado", color: "bg-red-100 text-red-800" };
    if (score >= 85) return { label: "Excelente", color: "bg-green-100 text-green-800" };
    if (score >= 70) return { label: "Elegível", color: "bg-blue-100 text-blue-800" };
    if (score >= 50) return { label: "Atenção", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Berlinda", color: "bg-red-100 text-red-800" };
  };

  // Filter employees
  const filteredData = allAverages?.filter((item) => {
    const matchesSearch = item.employee.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "evaluated" && item.evaluationCount === 0) return false;
    if (filterStatus === "pending" && item.evaluationCount > 0) return false;
    
    return matchesSearch;
  });

  // Stats
  const stats = {
    total: allAverages?.length || 0,
    evaluated: allAverages?.filter(e => e.evaluationCount > 0).length || 0,
    pending: allAverages?.filter(e => e.evaluationCount === 0).length || 0,
  };

  const isCycleClosed = currentCycle?.status === "closed";

  // Navigate to evaluate with employee pre-selected
  const goToEvaluate = (employeeId: number) => {
    setLocation(`/evaluate?employee=${employeeId}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Avaliações do Mês</h1>
        <p className="text-muted-foreground">
          Ciclo: {currentCycle?.month}/{currentCycle?.year}
          {isCycleClosed && (
            <Badge variant="secondary" className="ml-2">Encerrado</Badge>
          )}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.evaluated}</p>
                <p className="text-xs text-muted-foreground">Com Avaliações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Sem Avaliação</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {allAverages?.filter(e => (e.averageScore || 0) < 50 && e.evaluationCount > 0).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Em Berlinda</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Progress value={(stats.evaluated / stats.total) * 100} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.evaluated / stats.total) * 100 || 0)}% avaliados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="evaluated">Com Avaliações</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations List */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliações por Colaborador</CardTitle>
          <CardDescription>
            A média de todas as avaliações do mês é a nota oficial de cada colaborador
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredData && filteredData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-center">Avaliações</TableHead>
                  <TableHead className="text-center">Média (Nota Oficial)</TableHead>
                  <TableHead className="text-center">Atrasos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  const status = getScoreStatus(item.averageScore, item.lateCount);

                  return (
                    <TableRow key={item.employee.id}>
                      <TableCell className="font-medium">{item.employee.name}</TableCell>
                      <TableCell>
                        <div className={`level-badge level-${item.employee.level.toLowerCase()}`}>
                          {item.employee.level}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{item.evaluationCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.averageScore !== null ? (
                          <span className={`text-xl font-bold ${getScoreColor(item.averageScore)}`}>
                            {item.averageScore}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.lateCount >= 3 ? (
                          <Badge variant="destructive">{item.lateCount}</Badge>
                        ) : (
                          <span>{item.lateCount}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!isCycleClosed && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => goToEvaluate(item.employee.id)}
                              className="gap-1"
                            >
                              <Plus className="h-4 w-4" />
                              Avaliar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum colaborador encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
