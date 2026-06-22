import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Clock, Sparkles, Wrench, Award, Shield, 
  AlertTriangle, Save, CheckCircle, User
} from "lucide-react";

interface IncidentInput {
  type: "rework" | "warning" | "accident" | "absence" | "other";
  description: string;
  blocksBonus: boolean;
}

const INDICATORS = [
  { key: "punctuality", label: "Pontualidade", icon: Clock, description: "Chegar no horário e cumprir jornada" },
  { key: "organization", label: "Organização (5S)", icon: Sparkles, description: "Manter ambiente limpo e organizado" },
  { key: "productivity", label: "Produtividade", icon: Wrench, description: "Entregar tarefas com eficiência" },
  { key: "quality", label: "Qualidade", icon: Award, description: "Trabalho sem retrabalho" },
  { key: "safety", label: "Segurança", icon: Shield, description: "Uso de EPIs e práticas seguras" },
];

const INCIDENT_TYPES = [
  { value: "rework", label: "Retrabalho" },
  { value: "warning", label: "Advertência" },
  { value: "accident", label: "Acidente" },
  { value: "absence", label: "Falta" },
  { value: "other", label: "Outro" },
];

export default function EvaluateNow() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const searchString = useSearch();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({
    punctuality: 15,
    organization: 15,
    productivity: 15,
    quality: 15,
    safety: 15,
  });
  const [lateCount, setLateCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [incidents, setIncidents] = useState<IncidentInput[]>([]);
  const [newIncident, setNewIncident] = useState<IncidentInput>({ type: "rework", description: "", blocksBonus: false });

  // Check for employee query param to pre-select
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const employeeParam = params.get('employee');
    if (employeeParam) {
      const empId = parseInt(employeeParam, 10);
      if (!isNaN(empId)) {
        setSelectedEmployeeId(empId);
      }
    }
  }, [searchString]);

  const { data: currentCycle } = trpc.cycle.getCurrent.useQuery();
  const { data: employees } = trpc.employee.list.useQuery({ status: "active" });
  const selectedEmployee = employees?.find(e => e.id === selectedEmployeeId);

  const createEvaluation = trpc.evaluation.create.useMutation({
    onSuccess: () => {
      toast.success("Avaliação salva com sucesso!");
      utils.evaluation.listByCycle.invalidate();
      utils.cycle.getStats.invalidate();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao salvar avaliação");
    },
  });

  const createIncident = trpc.incident.create.useMutation();

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreStatus = (score: number) => {
    if (score >= 85) return { label: "Excelente", color: "bg-green-100 text-green-800" };
    if (score >= 70) return { label: "Elegível", color: "bg-blue-100 text-blue-800" };
    if (score >= 50) return { label: "Atenção", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Berlinda", color: "bg-red-100 text-red-800" };
  };

  const resetForm = () => {
    setSelectedEmployeeId(null);
    setScores({ punctuality: 15, organization: 15, productivity: 15, quality: 15, safety: 15 });
    setLateCount(0);
    setNotes("");
    setIncidents([]);
  };

  const handleAddIncident = () => {
    if (newIncident.description.trim()) {
      setIncidents([...incidents, { ...newIncident }]);
      setNewIncident({ type: "rework", description: "", blocksBonus: false });
    }
  };

  const handleRemoveIncident = (index: number) => {
    setIncidents(incidents.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedEmployeeId || !currentCycle) {
      toast.error("Selecione um colaborador");
      return;
    }

    try {
      // Create evaluation (todas as avaliações contam para a média)
      const result = await createEvaluation.mutateAsync({
        employeeId: selectedEmployeeId,
        cycleId: currentCycle.id,
        punctuality: scores.punctuality,
        organization: scores.organization,
        productivity: scores.productivity,
        quality: scores.quality,
        safety: scores.safety,
        lateCount,
        notes,
        isOfficial: true, // Todas as avaliações são oficiais
      });

      // Create incidents
      for (const incident of incidents) {
        await createIncident.mutateAsync({
          employeeId: selectedEmployeeId,
          cycleId: currentCycle.id,
          evaluationId: result.id,
          type: incident.type,
          description: incident.description,
          blocksBonus: incident.blocksBonus,
          incidentDate: new Date().toISOString().split('T')[0],
        });
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const status = getScoreStatus(totalScore);
  const isBlocked = lateCount >= 3 || incidents.some(i => i.blocksBonus);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Avaliar Agora</h1>
        <p className="text-muted-foreground">
          Ciclo: {currentCycle?.month}/{currentCycle?.year}
        </p>
      </div>

      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Selecionar Colaborador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedEmployeeId?.toString() || ""} 
            onValueChange={(v) => setSelectedEmployeeId(parseInt(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha um colaborador..." />
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

          {selectedEmployee && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`level-badge level-${selectedEmployee.level.toLowerCase()}`}>
                  {selectedEmployee.level}
                </div>
                <div>
                  <p className="font-semibold">{selectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee.position || "Colaborador"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEmployeeId && (
        <>
          {/* Indicators */}
          <Card>
            <CardHeader>
              <CardTitle>Indicadores de Desempenho</CardTitle>
              <CardDescription>Avalie cada indicador de 0 a 20 pontos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {INDICATORS.map(({ key, label, icon: Icon, description }) => (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <Label className="font-medium">{label}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${scores[key] >= 15 ? 'text-green-600' : scores[key] >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {scores[key]}
                      </span>
                      <span className="text-muted-foreground">/ 20</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{description}</p>
                  <Slider
                    value={[scores[key]]}
                    onValueChange={([value]) => setScores({ ...scores, [key]: value })}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Score Summary */}
          <Card className={isBlocked ? "border-red-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Nota Final</span>
                <Badge className={status.color}>{status.label}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <div className={`text-6xl font-bold ${getScoreColor(totalScore)}`}>
                  {totalScore}
                </div>
                <div className="text-2xl text-muted-foreground">/ 100</div>
              </div>
              
              {isBlocked && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span>
                    {lateCount >= 3 ? "3+ atrasos: Premiação bloqueada" : "Ocorrência bloqueia premiação"}
                  </span>
                </div>
              )}
              
              {totalScore < 50 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Nota abaixo de 50: Colaborador entrará em Berlinda</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Late Count */}
          <Card>
            <CardHeader>
              <CardTitle>Atrasos no Mês</CardTitle>
              <CardDescription>3 ou mais atrasos bloqueiam a premiação automaticamente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLateCount(Math.max(0, lateCount - 1))}
                  disabled={lateCount === 0}
                >
                  -
                </Button>
                <span className={`text-3xl font-bold ${lateCount >= 3 ? 'text-red-600' : ''}`}>
                  {lateCount}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLateCount(lateCount + 1)}
                >
                  +
                </Button>
                {lateCount >= 3 && (
                  <Badge variant="destructive">Premiação Bloqueada</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Incidents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Ocorrências
              </CardTitle>
              <CardDescription>Registre retrabalhos, advertências, acidentes ou faltas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing incidents */}
              {incidents.map((incident, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <Badge variant={incident.blocksBonus ? "destructive" : "secondary"}>
                    {INCIDENT_TYPES.find(t => t.value === incident.type)?.label}
                  </Badge>
                  <span className="flex-1">{incident.description}</span>
                  {incident.blocksBonus && (
                    <Badge variant="outline" className="text-red-600">Bloqueia Premiação</Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveIncident(index)}>
                    ✕
                  </Button>
                </div>
              ))}

              {/* Add new incident */}
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex gap-4">
                  <Select 
                    value={newIncident.type} 
                    onValueChange={(v) => setNewIncident({ ...newIncident, type: v as IncidentInput["type"] })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCIDENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Descrição da ocorrência..."
                    value={newIncident.description}
                    onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                    className="flex-1"
                    rows={1}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="blocksBonus"
                      checked={newIncident.blocksBonus}
                      onCheckedChange={(checked) => setNewIncident({ ...newIncident, blocksBonus: !!checked })}
                    />
                    <Label htmlFor="blocksBonus" className="text-sm">Bloqueia premiação</Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddIncident}>
                    Adicionar Ocorrência
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observações adicionais sobre o colaborador..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Todas as avaliações são contabilizadas automaticamente na média mensal do colaborador.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={handleSubmit}
                  disabled={createEvaluation.isPending}
                >
                  <Save className="h-4 w-4" />
                  Salvar Avaliação
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
