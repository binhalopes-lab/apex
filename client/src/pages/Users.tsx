import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Users as UsersIcon, Shield, UserCheck, Search, 
  Edit, Link, Unlink, Crown, UserCog, User, HardHat
} from "lucide-react";

const ROLE_CONFIG = {
  admin: { label: "Administrador", color: "bg-purple-100 text-purple-800", icon: Crown },
  leader: { label: "Líder", color: "bg-blue-100 text-blue-800", icon: Shield },
  captain: { label: "Capitão", color: "bg-green-100 text-green-800", icon: UserCog },
  employee: { label: "Colaborador", color: "bg-gray-100 text-gray-800", icon: User },
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [linkingUser, setLinkingUser] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const { data: users, isLoading } = trpc.user.list.useQuery();
  const { data: employees } = trpc.employee.list.useQuery({ status: "active" });

  const updateRole = trpc.user.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Permissão atualizada com sucesso!");
      utils.user.list.invalidate();
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar permissão");
    },
  });

  const linkToEmployee = trpc.user.linkToEmployee.useMutation({
    onSuccess: () => {
      toast.success("Usuário vinculado com sucesso!");
      utils.user.list.invalidate();
      utils.employee.list.invalidate();
      setLinkingUser(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao vincular usuário");
    },
  });

  // Get linked employee for a user
  const getLinkedEmployee = (userId: number) => {
    return employees?.find(e => e.userId === userId);
  };

  // Filter users
  const filteredUsers = users?.filter((u) => {
    const matchesSearch = 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Stats
  const stats = {
    total: users?.length || 0,
    admins: users?.filter(u => u.role === "admin").length || 0,
    leaders: users?.filter(u => u.role === "leader").length || 0,
    captains: users?.filter(u => u.role === "captain").length || 0,
    employees: users?.filter(u => u.role === "employee").length || 0,
  };

  const handleUpdateRole = () => {
    if (!editingUser || !newRole) return;
    updateRole.mutate({ 
      userId: editingUser, 
      role: newRole as "admin" | "leader" | "captain" | "employee" 
    });
  };

  const handleLinkEmployee = () => {
    if (!linkingUser) return;
    linkToEmployee.mutate({ 
      userId: linkingUser, 
      employeeId: selectedEmployeeId ? parseInt(selectedEmployeeId) : null 
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <UsersIcon className="h-8 w-8" />
          Administração de Usuários
        </h1>
        <p className="text-muted-foreground">
          Gerencie permissões e vincule usuários a colaboradores
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.leaders}</p>
                <p className="text-xs text-muted-foreground">Líderes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.captains}</p>
                <p className="text-xs text-muted-foreground">Capitães</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{stats.employees}</p>
                <p className="text-xs text-muted-foreground">Colaboradores</p>
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
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Permissão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="leader">Líder</SelectItem>
                <SelectItem value="captain">Capitão</SelectItem>
                <SelectItem value="employee">Colaborador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Clique em "Editar" para alterar permissões ou vincular a um colaborador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Colaborador Vinculado</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((u) => {
                const roleConfig = ROLE_CONFIG[u.role as keyof typeof ROLE_CONFIG];
                const linkedEmployee = getLinkedEmployee(u.id);
                const RoleIcon = roleConfig.icon;
                const isCurrentUser = u.id === currentUser?.id;

                return (
                  <TableRow key={u.id} className={isCurrentUser ? "bg-primary/5" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <RoleIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{u.name || "Sem nome"}</p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">Você</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={roleConfig.color}>
                        {roleConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {linkedEmployee ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span>{linkedEmployee.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {linkedEmployee.level}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Não vinculado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(u.lastSignedIn)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingUser(u.id);
                            setNewRole(u.role);
                          }}
                          disabled={isCurrentUser}
                          title={isCurrentUser ? "Você não pode editar suas próprias permissões" : "Editar permissão"}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setLinkingUser(u.id);
                            setSelectedEmployeeId(linkedEmployee?.id?.toString() || "");
                          }}
                          title="Vincular a colaborador"
                        >
                          {linkedEmployee ? (
                            <Unlink className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Link className="h-4 w-4 text-blue-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Permissão</DialogTitle>
            <DialogDescription>
              Selecione a nova permissão para este usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Permissão</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a permissão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-purple-600" />
                      Administrador - Acesso total ao sistema
                    </div>
                  </SelectItem>
                  <SelectItem value="leader">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      Líder - Avaliar e gerenciar equipe
                    </div>
                  </SelectItem>
                  <SelectItem value="captain">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-green-600" />
                      Capitão - Avaliar colaboradores
                    </div>
                  </SelectItem>
                  <SelectItem value="employee">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      Colaborador - Apenas visualizar próprio painel
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={updateRole.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Employee Dialog */}
      <Dialog open={!!linkingUser} onOpenChange={() => setLinkingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a Colaborador</DialogTitle>
            <DialogDescription>
              Vincule este usuário a um colaborador para que ele acesse seu próprio painel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="text-muted-foreground">Nenhum (desvincular)</span>
                  </SelectItem>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{emp.name}</span>
                        <Badge variant="outline" className="text-xs">{emp.level}</Badge>
                        {emp.userId && emp.userId !== linkingUser && (
                          <Badge variant="secondary" className="text-xs">Já vinculado</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleLinkEmployee} disabled={linkToEmployee.isPending}>
              {selectedEmployeeId ? "Vincular" : "Desvincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
