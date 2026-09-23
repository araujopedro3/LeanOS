"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { processById, type Improvement, type LeanProcess, type TaskItem } from "@/lib/leanos-data";
import { localDate, validEmail, type EmployeeDraft } from "@/lib/leanos-storage";
import { calendarDate, measurementMinutes, uniqueStageNames } from "@/lib/leanos-domain";

export function NewTaskDialog({ open, onOpenChange, processes, employees, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; processes: LeanProcess[]; employees: EmployeeDraft[]; onCreate: (task: TaskItem) => void | boolean }) {
  const availableOwners = employees.map((employee) => employee.nome.trim()).filter(Boolean);
  const [title, setTitle] = useState("");
  const [processId, setProcessId] = useState(processes[0]?.id ?? "");
  const [owner, setOwner] = useState(availableOwners[0] ?? "");
  const [priority, setPriority] = useState<TaskItem["priority"]>("Média");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");


  const submit = () => {
    if (!availableOwners.length) {
      setError("Cadastre pelo menos um funcionário na empresa antes de criar tarefas.");
      return;
    }
    if (!title.trim() || !processes.some((process) => process.id === processId) || !availableOwners.includes(owner) || !due) {
      setError("Preencha o título, processo, responsável e prazo.");
      return;
    }
    if (onCreate({ id: `TSK-${crypto.randomUUID()}`, title: title.trim(), processId, owner: owner.trim(), priority, status: "Pendente", due, progress: 0 }) === false) return;
    setTitle("");
    setOwner(availableOwners[0] ?? "");
    setDue("");
    setPriority("Média");
    setError("");
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Nova tarefa</DialogTitle><DialogDescription>Adicione uma ação vinculada a um processo da operação.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Título"><Input aria-label="Título da tarefa" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Revisar sequência de conferência" /></Field><Field label="Processo"><Select value={processId} onValueChange={setProcessId}><SelectTrigger aria-label="Processo" className="w-full"><SelectValue placeholder="Selecione um processo" /></SelectTrigger><SelectContent>{processes.map((process) => <SelectItem key={process.id} value={process.id}>{process.name}</SelectItem>)}</SelectContent></Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Responsável"><Select value={owner} onValueChange={setOwner}><SelectTrigger aria-label="Responsável" className="w-full"><SelectValue placeholder="Selecione um responsável" /></SelectTrigger><SelectContent>{availableOwners.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}</SelectContent></Select></Field><Field label="Prioridade"><Select value={priority} onValueChange={(value) => setPriority(value as TaskItem["priority"])}><SelectTrigger aria-label="Prioridade" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Baixa">Baixa</SelectItem><SelectItem value="Média">Média</SelectItem><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Crítica">Crítica</SelectItem></SelectContent></Select></Field></div><Field label="Prazo"><Input aria-label="Prazo" type="date" value={due} onChange={(event) => setDue(event.target.value)} /></Field>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Adicionar tarefa</Button></DialogFooter></DialogContent></Dialog>;
}

export function NewEmployeeDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (employee: EmployeeDraft) => Promise<void> }) {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    if (!nome.trim() || !cargo.trim() || !email.trim() || !senha.trim()) {
      setError("Preencha nome, função, e-mail e senha.");
      return;
    }
    if (!validEmail(email)) { setError("Informe um e-mail válido."); return; }
    setBusy(true);
    try { await onCreate({ nome: nome.trim(), cargo: cargo.trim(), email: email.trim().toLowerCase(), senha }); }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível adicionar o funcion?rio."); setBusy(false); return; }
    setBusy(false);
    setNome("");
    setCargo("");
    setEmail("");
    setSenha("");
    setError("");
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Adicionar funcionário</DialogTitle><DialogDescription>Cadastre os dados e a função do trabalhador.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Nome"><Input aria-label="Nome do funcionário" value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome completo" /></Field><Field label="Função do trabalhador"><Input aria-label="Função do trabalhador" value={cargo} onChange={(event) => setCargo(event.target.value)} placeholder="Ex.: Analista de produção" /></Field><Field label="E-mail"><Input aria-label="E-mail do funcionário" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="funcionario@empresa.com" /></Field><Field label="Senha"><Input aria-label="Senha do funcionário" type="password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Senha do funcionário" /></Field>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={busy} onClick={submit}>Adicionar funcionário</Button></DialogFooter></DialogContent></Dialog>;
}

export function NewProcessDialog({ isAdmin, open, onOpenChange, employees, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; employees: EmployeeDraft[]; isAdmin: boolean; onCreate: (process: LeanProcess) => void | boolean }) {
  const availableOwners = employees.map((employee) => employee.nome.trim()).filter(Boolean);
  const [name, setName] = useState(""); const [owner, setOwner] = useState(availableOwners[0] ?? ""); const [stages, setStages] = useState(""); const [due, setDue] = useState(localDate()); const [error, setError] = useState("");


  const submit = () => {
    let stageNames: string[];
    try { stageNames = uniqueStageNames(stages); } catch (error) { setError((error as Error).message); return; }
    if (!calendarDate(due) || due < localDate()) { setError("O prazo não pode ser anterior à data inicial do processo."); return; }
    if (!availableOwners.length) {
      setError("Cadastre pelo menos um funcionário na empresa antes de criar processos.");
      return;
    }
    if (!name.trim() || !stageNames.length || !availableOwners.includes(owner) || !due) {
      setError("Informe o nome do processo, a etapa e o responsável da empresa.");
      return;
    }
    const id = `PRC-${crypto.randomUUID()}`; if (onCreate({ id, name: name.trim(), owner, status: "Planejado", priority: "Média", category: "Operacional", progress: 0, start: localDate(), due: due || localDate(), updated: "Agora", stages: stageNames.map((stage,index) => ({ id: `${id}-E${index+1}`, name: stage, order: index+1, measurements: [] })) }) === false) return; setName(""); setOwner(availableOwners[0] ?? ""); setStages(""); setError(""); onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Novo processo</DialogTitle><DialogDescription>Cadastre o fluxo em ordem. Cada processo deve possuir pelo menos uma etapa.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Nome do processo"><Input aria-label="Nome do processo" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Atendimento ao cliente" /></Field><Field label="Responsável"><Select value={owner} onValueChange={setOwner}><SelectTrigger aria-label="Responsável" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{availableOwners.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}</SelectContent></Select></Field>{!isAdmin ? <Field label="Prazo"><Input type="date" aria-label="Prazo do processo" value={due} onChange={(e) => setDue(e.target.value)} /></Field> : null}<Field label="Etapas em ordem" hint="Uma etapa por linha"><Textarea aria-label="Etapas em ordem" value={stages} onChange={(e) => setStages(e.target.value)} placeholder={"1. Receber solicitação\n2. Analisar\n3. Concluir"} rows={5} /></Field>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Criar processo</Button></DialogFooter></DialogContent></Dialog>;
}

export function MeasurementDialog({ open, onOpenChange, processes, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; processes: LeanProcess[]; onSave: (processId: string, stageId: string, minutes: number, start: string, end: string) => void | boolean }) {
  const [processId, setProcessId] = useState(processes[0]?.id ?? ""); const process = processById(processes, processId); const [stageId, setStageId] = useState(processes[0]?.stages[0]?.id ?? ""); const [start, setStart] = useState(`${localDate()}T09:00`); const [end, setEnd] = useState(`${localDate()}T09:20`); const [error, setError] = useState("");
  const changeProcess = (value: string) => { setProcessId(value); setStageId(processById(processes, value)?.stages[0]?.id ?? ""); };
  const submit = () => { let duration = 0; try { duration = measurementMinutes(start, end); } catch { /* The form displays the validation message on submission. */ } if (!process || !process.stages.some((stage) => stage.id === stageId)) { setError("Selecione o processo e a etapa."); return; } if (!Number.isFinite(duration) || duration <= 0) { setError("O horário de término não pode ser anterior ou igual ao início."); return; } if (onSave(processId, stageId, duration, start, end) === false) return; setError(""); onOpenChange(false); };
  let duration = 0; try { duration = measurementMinutes(start, end); } catch { /* The form displays the validation message on submission. */ }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Registrar medição</DialogTitle><DialogDescription>A duração é calculada automaticamente e não pode ser editada manualmente.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Processo"><Select value={processId} onValueChange={changeProcess}><SelectTrigger aria-label="Processo" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{processes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Etapa"><Select value={stageId} onValueChange={setStageId}><SelectTrigger aria-label="Etapa" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{process?.stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.order}. {stage.name}</SelectItem>)}</SelectContent></Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Início"><Input aria-label="Início" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></Field><Field label="Término"><Input aria-label="Término" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></Field></div><div className="rounded-xl bg-[#eaf3f0] p-4"><p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">Duração calculada</p><p className="mt-1 text-2xl font-semibold text-primary">{duration > 0 ? `${duration} min` : "—"}</p></div>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Confirmar medição</Button></DialogFooter></DialogContent></Dialog>;
}

export function ImprovementDialog({ isAdmin, open, onOpenChange, processes, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; processes: LeanProcess[]; isAdmin: boolean; onSave: (item: Improvement) => void | boolean }) {
  const [processId, setProcessId] = useState(processes[0]?.id ?? ""); const process = processById(processes, processId); const [stageId, setStageId] = useState(processes[0]?.stages[0]?.id ?? ""); const [title, setTitle] = useState(""); const [problem, setProblem] = useState(""); const [action, setAction] = useState(""); const [error, setError] = useState("");
  const submit = () => { if (!title.trim() || !problem.trim() || !action.trim() || !process || !process.stages.some((stage) => stage.id === stageId)) { setError("Preencha o título, o problema e a ação proposta."); return; } const stage = process.stages.find((item) => item.id === stageId); const values = stage?.measurements ?? []; const before = values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0; if (onSave({ id:`MEL-${crypto.randomUUID()}`, title:title.trim(), processId, stageId, baselineSamples: values.length, stage:stage?.name ?? "Sem etapa", problem:problem.trim(), action:action.trim(), owner:process.owner, priority:"Alta", status:"Proposta", before, after:null, date:localDate() }) === false) return; setTitle(""); setProblem(""); setAction(""); setError(""); onOpenChange(false); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Novo plano de melhoria</DialogTitle><DialogDescription>Registre a intervenção e preserve o indicador anterior para a comparação futura.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Processo"><Select value={processId} onValueChange={(value) => { setProcessId(value); setStageId(processById(processes, value)?.stages[0]?.id ?? ""); }}><SelectTrigger aria-label="Processo" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{processes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>{!isAdmin ? <Field label="Etapa"><Select value={stageId} onValueChange={setStageId}><SelectTrigger aria-label="Etapa da melhoria" className="w-full"><SelectValue placeholder="Selecione uma etapa" /></SelectTrigger><SelectContent>{process?.stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}</SelectContent></Select></Field> : null}<Field label="Título"><Input aria-label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome claro para a melhoria" /></Field><Field label="Problema identificado"><Textarea aria-label="Problema identificado" value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} /></Field><Field label="Ação proposta"><Textarea aria-label="Ação proposta" value={action} onChange={(e) => setAction(e.target.value)} rows={3} /></Field>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Registrar plano</Button></DialogFooter></DialogContent></Dialog>;
}

export function ImprovementActions({ item, process, onUpdate }: { item: Improvement; process?: LeanProcess; onUpdate: (item: Improvement) => void | boolean }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>Atualizar plano</Button>{open ? <ImprovementResultDialog item={item} process={process} onClose={() => setOpen(false)} onUpdate={onUpdate} /> : null}</>;
}

function ImprovementResultDialog({ item, process, onClose, onUpdate }: { item: Improvement; process?: LeanProcess; onClose: () => void; onUpdate: (item: Improvement) => void | boolean }) {
  const stage = process?.stages.find((stage) => item.stageId ? stage.id === item.stageId : stage.name === item.stage);
  const laterSamples = item.baselineSamples === undefined ? [] : stage?.measurements.slice(item.baselineSamples) ?? [];
  const measuredAfter = laterSamples.length ? laterSamples.reduce((sum, value) => sum + value, 0) / laterSamples.length : null;
  const [status, setStatus] = useState(item.status);
  const [after, setAfter] = useState(item.after === null ? measuredAfter === null ? "" : String(Math.round(measuredAfter * 100) / 100) : String(item.after));
  const [error, setError] = useState("");
  const submit = () => {
    const value = after.trim() === "" ? null : Number(after);
    if ((value !== null && (!Number.isFinite(value) || value <= 0)) || (status === "Implementada" && value === null)) {
      setError("Informe um tempo posterior maior que zero para concluir a melhoria."); return;
    }
    if (onUpdate({ ...item, status, after: value }) === false) return;
    toast.success("Plano de melhoria atualizado");
    onClose();
  };
  return <Dialog open onOpenChange={(value) => !value && onClose()}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Atualizar plano de melhoria</DialogTitle><DialogDescription>{item.title} · {item.stage}</DialogDescription></DialogHeader><Field label="Situação"><Select value={status} onValueChange={(value) => setStatus(value as Improvement["status"])}><SelectTrigger aria-label="Situação da melhoria"><SelectValue /></SelectTrigger><SelectContent>{(["Proposta", "Em execução", "Verificando", "Implementada"] as const).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="Tempo após a melhoria (min)"><Input type="number" min="0.01" step="any" aria-label="Tempo após a melhoria" value={after} onChange={(event) => setAfter(event.target.value)} /></Field><p className="text-sm text-muted-foreground">{measuredAfter === null ? "Registre o tempo observado após a intervenção." : `Média das novas medições: ${measuredAfter.toFixed(2)} min.`}{item.before <= 0 ? " Não há medição anterior para calcular a redução percentual." : ` Tempo anterior: ${item.before} min.`}</p>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={submit}>Salvar atualização</Button></DialogFooter></DialogContent></Dialog>;
}

export function CustomDateDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (open: boolean) => void; onApply: () => void }) { return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Período personalizado</DialogTitle><DialogDescription>Escolha o intervalo usado nos indicadores e gráficos.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Data inicial"><Input aria-label="Data inicial" type="date" defaultValue="2026-09-01" /></Field><Field label="Data final"><Input aria-label="Data final" type="date" defaultValue="2026-09-15" /></Field></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={onApply}>Aplicar período</Button></DialogFooter></DialogContent></Dialog>; }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <div className="space-y-2"><div className="flex items-center justify-between"><Label>{label}</Label>{hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}</div>{children}</div>; }
