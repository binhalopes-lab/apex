import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Users, Plus, Edit, Search, TrendingUp, AlertTriangle, Trash2
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

const LEVELS = ["N1", "N2", "N3", "N4", "N5"] as const;

export default function Employees() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<"all" | typeof LEVELS[number]>("all");
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    position: "",
    level: "N1" as typeof LEVELS[number],
    baseSalary: "",
    hireDate: "",
  });

  const { data: employees, isLoading } = trpc.employee.list.useQuery({ status: "active" });

  const createEmployee = trpc.employee.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador cadastrado com sucesso!");
      utils.employee.list.invalidate();
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cadastrar colaborador");
    },
  });

  const updateEmployee = trpc.employee.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado!");
      utils.employee.list.invalidate();
      resetForm();
      setEditingEmployee(null);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar colaborador");
    },
  });

  const deleteEmployee = trpc.employee.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador excluído com sucesso!");
      utils.employee.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir colaborador");
    },
  });

  const handleDelete = (id: number) => {
    deleteEmployee.mutate({ id });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      cpf: "",
      position: "",
      level: "N1",
      baseSalary: "",
      hireDate: "",
    });
  };

  const handleEdit = (employee: NonNullable<typeof employees>[number]) => {
    setFormData({
      name: employee.name,
      cpf: employee.cpf || "",
      position: employee.position || "",
      level: employee.level,
      baseSalary: employee.baseSalary ? (employee.baseSalary / 100).toFixed(2) : "",
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : "",
    });
    setEditingEmployee(employee.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Informe o nome do colaborador");
      return;
    }

    const salaryInCents = formData.baseSalary 
      ? Math.round(parseFloat(formData.baseSalary.replace(/[^\d,.-]/g, '').replace(',', '.')) * 100)
      : 0;

    if (editingEmployee) {
      updateEmployee.mutate({
        id: editingEmployee,
        name: formData.name,
        cpf: formData.cpf || undefined,
        position: formData.position || undefined,
        level: formData.level,
        baseSalary: salaryInCents,
      });
    } else {
      createEmployee.mutate({
        name: formData.name,
        cpf: formData.cpf || undefined,
        position: formData.position || undefined,
        level: formData.level,
        baseSalary: salaryInCents,
        hireDate: formData.hireDate || undefined,
      });
    }
  };

  // Filter employees
  const filteredEmployees = employees?.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === "all" || emp.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  // Stats
  const stats = {
    total: employees?.length || 0,
    byLevel: LEVELS.reduce((acc, level) => {
      acc[level] = employees?.filter(e => e.level === level).length || 0;
      return acc;
    }, {} as Record<string, number>),
    inBerlinda: employees?.filter(e => e.isInBerlinda).length || 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground">Gestão da equipe de produção</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => { resetForm(); setEditingEmployee(null); }}>
                <Plus className="h-4 w-4" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
                <DialogDescription>
                  {editingEmployee ? "Atualize os dados do colaborador" : "Cadastre um novo membro da equipe"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do colaborador"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hireDate">Data de Admissão</Label>
                    <Input
                      id="hireDate"
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    placeholder="Ex: Serralheiro, Ajudante..."
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nível</Label>
                    <Select 
                      value={formData.level} 
                      onValueChange={(v) => setFormData({ ...formData, level: v as typeof LEVELS[number] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">Salário Base (R$)</Label>
                    <Input
                      id="baseSalary"
                      type="text"
                      placeholder="0,00"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { resetForm(); setEditingEmployee(null); setIsDialogOpen(false); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={createEmployee.isPending || updateEmployee.isPending}>
                  {editingEmployee ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {LEVELS.map((level) => (
          <Card key={level}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className={`level-badge level-${level.toLowerCase()}`}>{level}</div>
                <div>
                  <p className="text-2xl font-bold">{stats.byLevel[level]}</p>
                  <p className="text-xs text-muted-foreground">{level}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.inBerlinda}</p>
                <p className="text-xs text-muted-foreground">Berlinda</p>
              </div>
            </div>
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
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as typeof filterLevel)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Colaboradores</CardTitle>
          <CardDescription>
            {filteredEmployees?.length || 0} colaboradores encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredEmployees && filteredEmployees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Salário Base</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="w-20"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="text-muted-foreground">{employee.position || "-"}</TableCell>
                    <TableCell>
                      <div className={`level-badge level-${employee.level.toLowerCase()}`}>
                        {employee.level}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(employee.baseSalary || 0)}</TableCell>
                    <TableCell>
                      {employee.isInBerlinda ? (
                        <Badge variant="destructive">Berlinda</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">Ativo</Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
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
                                <AlertDialogTitle>Excluir Colaborador?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O colaborador <strong>{employee.name}</strong> será marcado como inativo.
                                  Suas avaliações e histórico serão mantidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(employee.id)}
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
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum colaborador encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
