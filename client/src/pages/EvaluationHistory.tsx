import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  History, Edit, Trash2, Calendar, User, 
  Clock, Sparkles, Wrench, Award, Shield, Eye
} from "lucide-react";

const INDICATORS = [
  { key: "punctuality", label: "Pontualidade", icon: Clock },
  { key: "organization", label: "5S", icon: Sparkles },
  { key: "productivity", label: "Produtividade", icon: Wrench },
  { key: "quality", label: "Qualidade", icon: Award },
  { key: "safety", label: "Segurança", icon: Shield },
];

export default function EvaluationHistory() {
  const utils = trpc.useUtils();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [editingEvaluation, setEditingEvaluation] = useState<any>(null);
  const [viewingEvaluation, setViewingEvaluation] = useState<any>(null);
  const [editScores, setEditScores] = useState<Record<string, number>>({});
  const [editLateCount, setEditLateCount] = useState(0);
  const [editNotes, setEditNotes] = useState("");

  const { data: employees, isLoading: empLoading } = trpc.employee.list.useQuery({ status: "active" });
  const { data: cycles } = trpc.cycle.list.useQuery();
  const { data: currentCycle } = trpc.cycle.getCurrent.useQuery();
  
  const { data: evaluations, isLoading: evalLoading } = trpc.evaluation.listByEmployee.useQuery(
    { employeeId: selectedEmployeeId || 0, cycleId: selectedCycleId || undefined },
    { enabled: !!selectedEmployeeId }
  );

  const updateEvaluation = trpc.evaluation.update.useMutation({
    onSuccess: () => {
      toast.success("Avaliação atualizada com sucesso!");
      utils.evaluation.listByEmployee.invalidate();
      setEditingEvaluation(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar avaliação");
    },
  });

  const deleteEvaluation = trpc.evaluation.delete.useMutation({
    onSuccess: () => {
      toast.success("Avaliação excluída com sucesso!");
      utils.evaluation.listByEmployee.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir avaliação");
    },
  });

  const handleEdit = (evaluation: any) => {
    setEditingEvaluation(evaluation);
    setEditScores({
      punctuality: evaluation.punctuality,
      organization: evaluation.organization,
      productivity: evaluation.productivity,
      quality: evaluation.quality,
      safety: evaluation.safety,
    });
    setEditLateCount(evaluation.lateCount);
    setEditNotes(evaluation.notes || "");
  };

  const handleSaveEdit = () => {
    if (!editingEvaluation) return;
    
    updateEvaluation.mutate({
      id: editingEvaluation.id,
      punctuality: editScores.punctuality,
      organization: editScores.organization,
      productivity: editScores.productivity,
      quality: editScores.quality,
      safety: editScores.safety,
      lateCount: editLateCount,
      notes: editNotes,
    });
  };

  const handleDelete = (id: number) => {
    deleteEvaluation.mutate({ id });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const selectedEmployee = employees?.find(e => e.id === selectedEmployeeId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <History className="h-8 w-8" />
          Histórico de Avaliações
        </h1>
        <p className="text-muted-foreground">
          Visualize, edite ou exclua avaliações anteriores
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label>Colaborador</Label>
            <Select 
              value={selectedEmployeeId?.toString() || ""} 
              onValueChange={(v) => setSelectedEmployeeId(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um colaborador..." />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{emp.name}</span>
                      <Badge variant="outline">{emp.level}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <Label>Ciclo (opcional)</Label>
            <Select 
              value={selectedCycleId?.toString() || "all"} 
              onValueChange={(v) => setSelectedCycleId(v === "all" ? null : parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os ciclos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os ciclos</SelectItem>
                {cycles?.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id.toString()}>
                    {cycle.month}/{cycle.year} {cycle.status === 'active' && '(Atual)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {selectedEmployeeId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Avaliações de {selectedEmployee?.name}
            </CardTitle>
            <CardDescription>
              {evaluations?.length || 0} avaliação(ões) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {evalLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : evaluations && evaluations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Nota Total</TableHead>
                    <TableHead className="text-center">Atrasos</TableHead>
                    <TableHead className="text-center">Oficial</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(evaluation.evaluatedAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xl font-bold ${getScoreColor(evaluation.totalScore)}`}>
                          {evaluation.totalScore}
                        </span>
                        <span className="text-muted-foreground">/100</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={evaluation.lateCount >= 3 ? "destructive" : "secondary"}>
                          {evaluation.lateCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {evaluation.isOfficial ? (
                          <Badge className="bg-green-100 text-green-800">Oficial</Badge>
                        ) : (
                          <Badge variant="outline">Rascunho</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingEvaluation(evaluation)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(evaluation)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Avaliação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. A avaliação será permanentemente removida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(evaluation.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma avaliação encontrada para este colaborador.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecione um colaborador para ver o histórico de avaliações.</p>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewingEvaluation} onOpenChange={() => setViewingEvaluation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação</DialogTitle>
            <DialogDescription>
              {viewingEvaluation && formatDate(viewingEvaluation.evaluatedAt)}
            </DialogDescription>
          </DialogHeader>
          {viewingEvaluation && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Nota Total</p>
                <p className={`text-4xl font-bold ${getScoreColor(viewingEvaluation.totalScore)}`}>
                  {viewingEvaluation.totalScore}/100
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {INDICATORS.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{label}:</span>
                    <span className="font-bold ml-auto">
                      {viewingEvaluation[key]}/20
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Atrasos:</span>
                <Badge variant={viewingEvaluation.lateCount >= 3 ? "destructive" : "secondary"} className="ml-auto">
                  {viewingEvaluation.lateCount}
                </Badge>
              </div>
              
              {viewingEvaluation.notes && (
                <div className="p-3 bg-muted/50 rounded">
                  <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                  <p className="text-sm">{viewingEvaluation.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEvaluation} onOpenChange={() => setEditingEvaluation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Avaliação</DialogTitle>
            <DialogDescription>
              Modifique os valores da avaliação abaixo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Indicators */}
            {INDICATORS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <Label>{label}</Label>
                  </div>
                  <span className="font-bold">{editScores[key]}/20</span>
                </div>
                <Slider
                  value={[editScores[key] || 0]}
                  onValueChange={([value]) => setEditScores({ ...editScores, [key]: value })}
                  max={20}
                  step={1}
                />
              </div>
            ))}
            
            {/* Late Count */}
            <div className="space-y-2">
              <Label>Atrasos no Mês</Label>
              <Input
                type="number"
                min={0}
                value={editLateCount}
                onChange={(e) => setEditLateCount(parseInt(e.target.value) || 0)}
              />
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Observações sobre a avaliação..."
              />
            </div>
            
            {/* Total Preview */}
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Nova Nota Total</p>
              <p className={`text-3xl font-bold ${getScoreColor(Object.values(editScores).reduce((a, b) => a + b, 0))}`}>
                {Object.values(editScores).reduce((a, b) => a + b, 0)}/100
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvaluation(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateEvaluation.isPending}>
              {updateEvaluation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
