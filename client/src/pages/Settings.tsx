import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, Flag, Target, Plus, Edit, Trash2,
  DollarSign, Percent, AlertTriangle
} from "lucide-react";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<number | null>(null);
  const [flagForm, setFlagForm] = useState({
    level: "",
    minRevenue: "",
    bonusPercentage: "",
  });

  const [indicatorDialogOpen, setIndicatorDialogOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<number | null>(null);
  const [indicatorForm, setIndicatorForm] = useState({
    name: "",
    code: "",
    description: "",
    maxScore: "20",
    isActive: true,
  });

  const { data: flags, isLoading: flagsLoading } = trpc.flag.list.useQuery();
  const { data: indicators, isLoading: indicatorsLoading } = trpc.indicator.list.useQuery();

  const createFlag = trpc.flag.create.useMutation({
    onSuccess: () => {
      toast.success("Bandeira criada com sucesso!");
      utils.flag.list.invalidate();
      resetFlagForm();
      setFlagDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar bandeira");
    },
  });

  const updateFlag = trpc.flag.update.useMutation({
    onSuccess: () => {
      toast.success("Bandeira atualizada!");
      utils.flag.list.invalidate();
      resetFlagForm();
      setEditingFlag(null);
      setFlagDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar bandeira");
    },
  });

  const deleteFlag = trpc.flag.delete.useMutation({
    onSuccess: () => {
      toast.success("Bandeira excluída!");
      utils.flag.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir bandeira");
    },
  });

  const createIndicator = trpc.indicator.create.useMutation({
    onSuccess: () => {
      toast.success("Indicador criado com sucesso!");
      utils.indicator.list.invalidate();
      resetIndicatorForm();
      setIndicatorDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar indicador");
    },
  });

  const updateIndicator = trpc.indicator.update.useMutation({
    onSuccess: () => {
      toast.success("Indicador atualizado!");
      utils.indicator.list.invalidate();
      resetIndicatorForm();
      setEditingIndicator(null);
      setIndicatorDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar indicador");
    },
  });

  const resetFlagForm = () => {
    setFlagForm({ level: "", minRevenue: "", bonusPercentage: "" });
  };

  const resetIndicatorForm = () => {
    setIndicatorForm({ name: "", code: "", description: "", maxScore: "20", isActive: true });
  };

  const handleEditFlag = (flag: NonNullable<typeof flags>[number]) => {
    setFlagForm({
      level: flag.level.toString(),
      minRevenue: (flag.minRevenue / 100).toFixed(2),
      bonusPercentage: flag.bonusPercentage.toString(),
    });
    setEditingFlag(flag.id);
    setFlagDialogOpen(true);
  };

  const handleEditIndicator = (indicator: NonNullable<typeof indicators>[number]) => {
    setIndicatorForm({
      name: indicator.name,
      code: indicator.code,
      description: indicator.description || "",
      maxScore: indicator.maxScore.toString(),
      isActive: indicator.isActive,
    });
    setEditingIndicator(indicator.id);
    setIndicatorDialogOpen(true);
  };

  const handleSubmitFlag = () => {
    const level = parseInt(flagForm.level);
    const minRevenue = Math.round(parseFloat(flagForm.minRevenue.replace(/[^\d,.-]/g, '').replace(',', '.')) * 100);
    const bonusPercentage = parseInt(flagForm.bonusPercentage);

    if (isNaN(level) || level < 1 || level > 10) {
      toast.error("Nível deve ser entre 1 e 10");
      return;
    }
    if (isNaN(minRevenue) || minRevenue <= 0) {
      toast.error("Informe um valor mínimo válido");
      return;
    }
    if (isNaN(bonusPercentage) || bonusPercentage < 0 || bonusPercentage > 100) {
      toast.error("Percentual deve ser entre 0 e 100");
      return;
    }

    if (editingFlag) {
      updateFlag.mutate({ id: editingFlag, minRevenue, bonusPercentage });
    } else {
      createFlag.mutate({ level, minRevenue, bonusPercentage });
    }
  };

  const handleSubmitIndicator = () => {
    if (!indicatorForm.name.trim()) {
      toast.error("Informe o nome do indicador");
      return;
    }
    const maxScore = parseInt(indicatorForm.maxScore);
    if (isNaN(maxScore) || maxScore <= 0) {
      toast.error("Pontuação máxima inválida");
      return;
    }

    if (editingIndicator) {
      updateIndicator.mutate({
        id: editingIndicator,
        name: indicatorForm.name,
        description: indicatorForm.description || undefined,
        maxScore,
        isActive: indicatorForm.isActive,
      });
    } else {
      // Gerar code automaticamente a partir do nome
      const generatedCode = indicatorForm.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      
      createIndicator.mutate({
        name: indicatorForm.name,
        code: generatedCode,
        description: indicatorForm.description || undefined,
        maxScore,
        isActive: indicatorForm.isActive,
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Apenas administradores podem acessar as configurações do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground">Gerencie as regras do sistema de avaliação</p>
      </div>

      <Tabs defaultValue="flags" className="space-y-6">
        <TabsList>
          <TabsTrigger value="flags" className="gap-2">
            <Flag className="h-4 w-4" />
            Bandeiras
          </TabsTrigger>
          <TabsTrigger value="indicators" className="gap-2">
            <Target className="h-4 w-4" />
            Indicadores
          </TabsTrigger>
        </TabsList>

        {/* Flags Tab */}
        <TabsContent value="flags">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bandeiras de Faturamento</CardTitle>
                <CardDescription>
                  Configure as faixas de faturamento e percentuais de premiação
                </CardDescription>
              </div>
              <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={() => { resetFlagForm(); setEditingFlag(null); }}>
                    <Plus className="h-4 w-4" />
                    Nova Bandeira
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingFlag ? "Editar Bandeira" : "Nova Bandeira"}</DialogTitle>
                    <DialogDescription>
                      Defina o nível, meta de faturamento e percentual de premiação
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="level">Nível (1-10)</Label>
                      <Input
                        id="level"
                        type="number"
                        min="1"
                        max="10"
                        placeholder="1"
                        value={flagForm.level}
                        onChange={(e) => setFlagForm({ ...flagForm, level: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minRevenue">Faturamento Mínimo (R$)</Label>
                      <Input
                        id="minRevenue"
                        type="text"
                        placeholder="50.000,00"
                        value={flagForm.minRevenue}
                        onChange={(e) => setFlagForm({ ...flagForm, minRevenue: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bonusPercentage">Percentual de Premiação (%)</Label>
                      <Input
                        id="bonusPercentage"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="15"
                        value={flagForm.bonusPercentage}
                        onChange={(e) => setFlagForm({ ...flagForm, bonusPercentage: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => { resetFlagForm(); setEditingFlag(null); setFlagDialogOpen(false); }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmitFlag} disabled={createFlag.isPending || updateFlag.isPending}>
                      {editingFlag ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {flagsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : flags && flags.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nível</TableHead>
                      <TableHead>Faturamento Mínimo</TableHead>
                      <TableHead>Premiação</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flags.map((flag) => (
                      <TableRow key={flag.id}>
                        <TableCell>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                            ${flag.level === 1 ? 'bg-green-500' :
                              flag.level === 2 ? 'bg-blue-500' :
                              flag.level === 3 ? 'bg-indigo-500' :
                              flag.level === 4 ? 'bg-purple-500' : 'bg-pink-500'}`}>
                            {flag.level}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {formatCurrency(flag.minRevenue)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <Percent className="h-3 w-3" />
                            {flag.bonusPercentage}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditFlag(flag)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => deleteFlag.mutate({ id: flag.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma bandeira configurada</p>
                  <Button variant="outline" className="mt-4" onClick={() => setFlagDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira bandeira
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Indicators Tab */}
        <TabsContent value="indicators">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Indicadores de Avaliação</CardTitle>
                <CardDescription>
                  Configure os indicadores usados nas avaliações de desempenho
                </CardDescription>
              </div>
              <Dialog open={indicatorDialogOpen} onOpenChange={setIndicatorDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={() => { resetIndicatorForm(); setEditingIndicator(null); }}>
                    <Plus className="h-4 w-4" />
                    Novo Indicador
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingIndicator ? "Editar Indicador" : "Novo Indicador"}</DialogTitle>
                    <DialogDescription>
                      Defina o nome, descrição e pontuação máxima do indicador
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Pontualidade"
                        value={indicatorForm.name}
                        onChange={(e) => setIndicatorForm({ ...indicatorForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        placeholder="Descreva o que este indicador avalia..."
                        value={indicatorForm.description}
                        onChange={(e) => setIndicatorForm({ ...indicatorForm, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxScore">Pontuação Máxima</Label>
                      <Input
                        id="maxScore"
                        type="number"
                        min="1"
                        placeholder="20"
                        value={indicatorForm.maxScore}
                        onChange={(e) => setIndicatorForm({ ...indicatorForm, maxScore: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="isActive"
                        checked={indicatorForm.isActive}
                        onCheckedChange={(checked) => setIndicatorForm({ ...indicatorForm, isActive: checked })}
                      />
                      <Label htmlFor="isActive">Indicador ativo</Label>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => { resetIndicatorForm(); setEditingIndicator(null); setIndicatorDialogOpen(false); }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmitIndicator} disabled={createIndicator.isPending || updateIndicator.isPending}>
                      {editingIndicator ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {indicatorsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : indicators && indicators.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Pontuação Máx.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indicators.map((indicator) => (
                      <TableRow key={indicator.id}>
                        <TableCell className="font-medium">{indicator.name}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {indicator.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{indicator.maxScore} pts</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={indicator.isActive ? "default" : "secondary"}>
                            {indicator.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEditIndicator(indicator)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum indicador configurado</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIndicatorDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeiro indicador
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
