import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  DollarSign, Plus, Trash2, Edit, Flag, 
  TrendingUp, Target, CheckCircle, Lock
} from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR');
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

export default function Revenue() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    projectName: "",
    description: "",
    revenueDate: new Date().toISOString().split('T')[0],
  });

  const { data: currentCycle } = trpc.cycle.getCurrent.useQuery();
  const { data: revenues } = trpc.revenue.listByCycle.useQuery(
    { cycleId: currentCycle?.id || 0 },
    { enabled: !!currentCycle?.id }
  );
  const { data: revenueStats } = trpc.revenue.getCycleTotal.useQuery(
    { cycleId: currentCycle?.id || 0 },
    { enabled: !!currentCycle?.id }
  );
  const { data: flags } = trpc.flag.list.useQuery();

  const createRevenue = trpc.revenue.create.useMutation({
    onSuccess: () => {
      toast.success("Faturamento lançado com sucesso!");
      utils.revenue.listByCycle.invalidate();
      utils.revenue.getCycleTotal.invalidate();
      utils.cycle.getStats.invalidate();
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao lançar faturamento");
    },
  });

  const updateRevenue = trpc.revenue.update.useMutation({
    onSuccess: () => {
      toast.success("Faturamento atualizado!");
      utils.revenue.listByCycle.invalidate();
      utils.revenue.getCycleTotal.invalidate();
      utils.cycle.getStats.invalidate();
      resetForm();
      setEditingRevenue(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar faturamento");
    },
  });

  const deleteRevenue = trpc.revenue.delete.useMutation({
    onSuccess: () => {
      toast.success("Faturamento excluído!");
      utils.revenue.listByCycle.invalidate();
      utils.revenue.getCycleTotal.invalidate();
      utils.cycle.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir faturamento");
    },
  });

  const closeCycle = trpc.cycle.close.useMutation({
    onSuccess: () => {
      toast.success("Ciclo encerrado com sucesso!");
      utils.cycle.getCurrent.invalidate();
      utils.cycle.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao encerrar ciclo");
    },
  });

  const resetForm = () => {
    setFormData({
      amount: "",
      projectName: "",
      description: "",
      revenueDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = () => {
    if (!currentCycle) return;
    
    const amountInCents = Math.round(parseFloat(formData.amount.replace(/[^\d,.-]/g, '').replace(',', '.')) * 100);
    
    if (isNaN(amountInCents) || amountInCents <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    if (editingRevenue) {
      updateRevenue.mutate({
        id: editingRevenue,
        amount: amountInCents,
        projectName: formData.projectName || undefined,
        description: formData.description || undefined,
        revenueDate: formData.revenueDate,
      });
    } else {
      createRevenue.mutate({
        cycleId: currentCycle.id,
        amount: amountInCents,
        projectName: formData.projectName || undefined,
        description: formData.description || undefined,
        revenueDate: formData.revenueDate,
      });
    }
  };

  const handleEdit = (revenue: NonNullable<typeof revenues>[number]) => {
    setFormData({
      amount: (revenue.amount / 100).toFixed(2),
      projectName: revenue.projectName || "",
      description: revenue.description || "",
      revenueDate: new Date(revenue.revenueDate).toISOString().split('T')[0],
    });
    setEditingRevenue(revenue.id);
    setIsAddDialogOpen(true);
  };

  const handleCloseCycle = () => {
    if (!currentCycle) return;
    closeCycle.mutate({ cycleId: currentCycle.id });
  };

  const isCycleClosed = currentCycle?.status === "closed";
  const currentFlag = revenueStats?.currentFlag;
  const nextFlag = revenueStats?.nextFlag;
  const progressToNextFlag = nextFlag && revenueStats?.total 
    ? Math.min(100, (revenueStats.total / nextFlag.minRevenue) * 100)
    : 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Faturamento do Mês</h1>
          <p className="text-muted-foreground">
            Ciclo: {currentCycle?.month}/{currentCycle?.year}
            {isCycleClosed && (
              <Badge variant="secondary" className="ml-2">
                <Lock className="h-3 w-3 mr-1" />
                Encerrado
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && !isCycleClosed && (
            <>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Lançamento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingRevenue ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
                    <DialogDescription>
                      Registre o faturamento de uma obra ou serviço
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Valor (R$)</Label>
                      <Input
                        id="amount"
                        type="text"
                        placeholder="0,00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Obra / Projeto (opcional)</Label>
                      <Input
                        id="projectName"
                        placeholder="Nome da obra..."
                        value={formData.projectName}
                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="revenueDate">Data</Label>
                      <Input
                        id="revenueDate"
                        type="date"
                        value={formData.revenueDate}
                        onChange={(e) => setFormData({ ...formData, revenueDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição (opcional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Detalhes do faturamento..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => { resetForm(); setEditingRevenue(null); setIsAddDialogOpen(false); }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={createRevenue.isPending || updateRevenue.isPending}>
                      {editingRevenue ? "Atualizar" : "Lançar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Flag className="h-4 w-4" />
                    Encerrar Ciclo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar Ciclo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é irreversível. Ao encerrar o ciclo:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>O faturamento será congelado em {formatCurrency(revenueStats?.total || 0)}</li>
                        <li>A bandeira final será definida como Bandeira {currentFlag?.level || 0}</li>
                        <li>As avaliações oficiais serão fixadas</li>
                        <li>Nenhum dado poderá ser alterado</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCloseCycle} className="bg-destructive text-destructive-foreground">
                      Confirmar Encerramento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Acumulado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(revenueStats?.total || 0)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {revenues?.length || 0} lançamentos
            </p>
          </CardContent>
        </Card>

        {/* Current Flag */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bandeira Atual</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {currentFlag ? (
              <>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${getFlagColor(currentFlag.level)} flex items-center justify-center text-white text-xl font-bold`}>
                    {currentFlag.level}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{currentFlag.bonusPercentage}%</p>
                    <p className="text-sm text-muted-foreground">de premiação</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">Nenhuma bandeira atingida</div>
            )}
          </CardContent>
        </Card>

        {/* Next Flag */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próxima Meta</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextFlag ? (
              <>
                <div className="text-lg font-bold">
                  Faltam {formatCurrency(revenueStats?.amountToNextFlag || 0)}
                </div>
                <Progress value={progressToNextFlag} className="mt-2 h-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  Para Bandeira {nextFlag.level} ({nextFlag.bonusPercentage}%)
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Bandeira máxima atingida!</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Flag Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso das Bandeiras</CardTitle>
          <CardDescription>Faixas de faturamento e premiação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {flags?.map((flag) => {
              const isAchieved = (revenueStats?.total || 0) >= flag.minRevenue;
              const isCurrent = currentFlag?.level === flag.level;
              const progress = Math.min(100, ((revenueStats?.total || 0) / flag.minRevenue) * 100);
              
              return (
                <div key={flag.id} className={`p-4 rounded-lg border ${isCurrent ? 'border-primary bg-primary/5' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isAchieved ? getFlagColor(flag.level) : 'bg-gray-300'}`}>
                        {flag.level}
                      </div>
                      <div>
                        <p className="font-medium">Bandeira {flag.level}</p>
                        <p className="text-sm text-muted-foreground">
                          Meta: {formatCurrency(flag.minRevenue)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{flag.bonusPercentage}%</p>
                      <p className="text-sm text-muted-foreground">premiação</p>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                  {isAchieved && (
                    <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Atingida
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revenue List */}
      <Card>
        <CardHeader>
          <CardTitle>Lançamentos do Mês</CardTitle>
          <CardDescription>Histórico de faturamento do ciclo atual</CardDescription>
        </CardHeader>
        <CardContent>
          {revenues && revenues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Obra / Projeto</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  {isAdmin && !isCycleClosed && <TableHead className="w-24"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenues.map((revenue) => (
                  <TableRow key={revenue.id}>
                    <TableCell>{formatDate(revenue.revenueDate)}</TableCell>
                    <TableCell>{revenue.projectName || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{revenue.description || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(revenue.amount)}</TableCell>
                    {isAdmin && !isCycleClosed && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(revenue as NonNullable<typeof revenues>[number])}>
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
                                <AlertDialogTitle>Excluir Lançamento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O valor de {formatCurrency(revenue.amount)} será removido do faturamento.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteRevenue.mutate({ id: revenue.id })}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum lançamento registrado</p>
              {isAdmin && !isCycleClosed && (
                <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Fazer primeiro lançamento
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
