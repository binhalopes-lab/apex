import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, Flag, DollarSign, Users, 
  CheckCircle, Clock, Lock
} from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function CycleHistory() {
  const { data: cycles, isLoading } = trpc.cycle.list.useQuery();
  const { data: flags } = trpc.flag.list.useQuery();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const getFlagByLevel = (level: number | null) => {
    if (!level) return null;
    return flags?.find(f => f.level === level);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Histórico de Ciclos
        </h1>
        <p className="text-muted-foreground">Visualize os ciclos mensais anteriores</p>
      </div>

      {/* Cycles List */}
      <Card>
        <CardHeader>
          <CardTitle>Ciclos Mensais</CardTitle>
          <CardDescription>
            {cycles?.length || 0} ciclos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cycles && cycles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead>Bandeira Final</TableHead>
                  <TableHead>Encerrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle) => {
                  const flag = getFlagByLevel(cycle.flagLevel);
                  return (
                    <TableRow key={cycle.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {MONTH_NAMES[cycle.month - 1]} / {cycle.year}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cycle.status === "closed" ? (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Encerrado
                          </Badge>
                        ) : (
                          <Badge className="gap-1">
                            <Clock className="h-3 w-3" />
                            Ativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {formatCurrency(cycle.totalRevenue || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {flag ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                              ${flag.level === 1 ? 'bg-green-500' :
                                flag.level === 2 ? 'bg-blue-500' :
                                flag.level === 3 ? 'bg-indigo-500' :
                                flag.level === 4 ? 'bg-purple-500' : 'bg-pink-500'}`}>
                              {flag.level}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {flag.bonusPercentage}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cycle.closedAt ? formatDate(cycle.closedAt) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum ciclo registrado ainda</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
