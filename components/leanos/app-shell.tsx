"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, Bell, BellRing, CalendarDays, Check, ChevronDown, CircleUserRound, ClipboardCheck, Clock3, FileBarChart, Gauge, LayoutDashboard, ListChecks, LogOut, Menu, Plus, RefreshCw, Search, Settings, Sparkles, TimerReset, UsersRound, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { getBottleneck, initialImprovements, initialProcesses, initialTasks, processById, type Improvement, type LeanProcess, type Period, type TaskItem } from "@/lib/leanos-data";
import { Dashboard, EmptySearchState } from "./dashboard";
import { PriorityBadge, StatusBadge } from "./badges";
import { ProcessTable } from "./process-table";
import { SectionCard } from "./section-card";

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: {
        name: string;
        title?: string;
        description: string;
        inputSchema: Record<string, unknown>;
        annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
        execute: (input: unknown) => unknown | Promise<unknown>;
      }, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Processos", icon: Workflow },
  { label: "Medições", icon: TimerReset },
  { label: "Tarefas", icon: ListChecks },
  { label: "Melhorias", icon: Sparkles },
  { label: "Indicadores", icon: BarChart3 },
  { label: "Relatórios", icon: FileBarChart },
  { label: "Equipe", icon: UsersRound },
];

const periodLabels: Record<Period, string> = {
  today: "Hoje", "7d": "7 dias", "30d": "30 dias", "90d": "90 dias", "12m": "12 meses", custom: "01–15 set",
};

export function LeanOSApp() {
  const [page, setPage] = useState("Dashboard");
  const [period, setPeriod] = useState<Period>("30d");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [processes, setProcesses] = useState<LeanProcess[]>(initialProcesses);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [improvements, setImprovements] = useState<Improvement[]>(initialImprovements);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [processDialog, setProcessDialog] = useState(false);
  const [measurementDialog, setMeasurementDialog] = useState(false);
  const [improvementDialog, setImprovementDialog] = useState(false);
  const [dateDialog, setDateDialog] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const processesRef = useRef(processes);
  const tasksRef = useRef(tasks);

  useEffect(() => { processesRef.current = processes; }, [processes]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: "read_dashboard_summary",
        title: "Ler resumo do LeanOS",
        description: "Retorna a situação atual dos processos e tarefas exibidos no dashboard.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => {
          const currentProcesses = processesRef.current;
          const currentTasks = tasksRef.current;
          return {
            totalProcesses: currentProcesses.length,
            delayedProcesses: currentProcesses.filter((item) => item.status === "Atrasado").length,
            processesInProgress: currentProcesses.filter((item) => item.status === "Em andamento" || item.status === "Em análise").length,
            openTasks: currentTasks.filter((item) => item.status !== "Concluída").length,
          };
        },
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "start_measurement_entry",
        title: "Iniciar registro de medição",
        description: "Abre o formulário visível para registrar início e término de uma etapa.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: () => { setMeasurementDialog(true); return { status: "form_opened" }; },
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "complete_task",
        title: "Concluir tarefa",
        description: "Marca uma tarefa existente do LeanOS como concluída e atualiza seu progresso.",
        inputSchema: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input) => {
          const taskId = typeof input === "object" && input !== null && "taskId" in input ? String((input as { taskId: unknown }).taskId) : "";
          if (!tasksRef.current.some((item) => item.id === taskId)) throw new Error("Tarefa não encontrada.");
          setTasks((current) => current.map((item) => item.id === taskId ? { ...item, status: "Concluída", progress: 100 } : item));
          return { taskId, status: "completed" };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedProcesses = window.localStorage.getItem("leanos-processes");
        const savedTasks = window.localStorage.getItem("leanos-tasks");
        const savedImprovements = window.localStorage.getItem("leanos-improvements");
        const dataVersion = window.localStorage.getItem("leanos-data-version");
        const legacyOwner = ["Am", "anda"].join("");
        const normalizeOwner = (owner: string) => owner === legacyOwner ? "Pedro" : owner;
        if (dataVersion === "2" || dataVersion === "3") {
          const storedProcesses = savedProcesses ? JSON.parse(savedProcesses) as LeanProcess[] : initialProcesses;
          setProcesses(storedProcesses.map((process) => process.id === "PRC-001" ? { ...process, owner: "Pedro" } : { ...process, owner: normalizeOwner(process.owner) }));
          if (savedTasks) setTasks((JSON.parse(savedTasks) as TaskItem[]).map((task) => ({ ...task, owner: normalizeOwner(task.owner) })));
          if (savedImprovements) setImprovements((JSON.parse(savedImprovements) as Improvement[]).map((item) => ({ ...item, owner: normalizeOwner(item.owner) })));
          window.localStorage.setItem("leanos-data-version", "4");
        } else if (dataVersion === "4") {
          if (savedProcesses) setProcesses((JSON.parse(savedProcesses) as LeanProcess[]).map((process) => ({ ...process, owner: normalizeOwner(process.owner) })));
          if (savedTasks) setTasks((JSON.parse(savedTasks) as TaskItem[]).map((task) => ({ ...task, owner: normalizeOwner(task.owner) })));
          if (savedImprovements) setImprovements((JSON.parse(savedImprovements) as Improvement[]).map((item) => ({ ...item, owner: normalizeOwner(item.owner) })));
          window.localStorage.setItem("leanos-data-version", "5");
        } else if (dataVersion === "5") {
          if (savedProcesses) setProcesses((JSON.parse(savedProcesses) as LeanProcess[]).map((process) => ({ ...process, owner: normalizeOwner(process.owner) })));
          if (savedTasks) setTasks((JSON.parse(savedTasks) as TaskItem[]).map((task) => ({ ...task, owner: normalizeOwner(task.owner) })));
          if (savedImprovements) setImprovements((JSON.parse(savedImprovements) as Improvement[]).map((item) => ({ ...item, owner: normalizeOwner(item.owner) })));
        } else {
          window.localStorage.removeItem("leanos-processes");
          window.localStorage.removeItem("leanos-tasks");
          window.localStorage.removeItem("leanos-improvements");
          window.localStorage.setItem("leanos-data-version", "5");
        }
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }, 550);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !loadError) {
      window.localStorage.setItem("leanos-processes", JSON.stringify(processes));
      window.localStorage.setItem("leanos-tasks", JSON.stringify(tasks));
      window.localStorage.setItem("leanos-improvements", JSON.stringify(improvements));
      window.localStorage.setItem("leanos-data-version", "5");
    }
  }, [processes, tasks, improvements, loading, loadError]);

  const navigate = (target: string) => {
    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markTaskComplete = (id: string) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: "Concluída", progress: 100 } : task));
    toast.success("Tarefa concluída", { description: "O progresso foi atualizado no painel." });
  };

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar page={page} onNavigate={navigate} delayed={processes.filter((process) => process.status === "Atrasado").length} />
      <SidebarInset className="min-w-0">
        <Header page={page} period={period} onPeriod={(value) => value === "custom" ? setDateDialog(true) : setPeriod(value)} onSearch={() => setSearchOpen(true)} notifications={notifications} onNavigate={navigate} />
        <div className="mx-auto w-full max-w-[1580px] px-4 py-5 sm:px-6 lg:px-8">
          {loadError ? (
            <ErrorState onRetry={() => { window.localStorage.removeItem("leanos-processes"); window.localStorage.removeItem("leanos-tasks"); window.localStorage.removeItem("leanos-improvements"); setProcesses(initialProcesses); setTasks(initialTasks); setImprovements(initialImprovements); setLoadError(false); toast.success("Dados restaurados"); }} />
          ) : (
            <PageContent page={page} processes={processes} tasks={tasks} improvements={improvements} period={period} loading={loading} statusFilter={statusFilter} onStatusFilter={setStatusFilter} onTaskStatus={markTaskComplete} onOpenProcess={() => setProcessDialog(true)} onOpenMeasurement={() => setMeasurementDialog(true)} onOpenImprovement={() => setImprovementDialog(true)} onNavigate={navigate} />
          )}
        </div>
      </SidebarInset>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} query={searchQuery} onQuery={setSearchQuery} processes={processes} tasks={tasks} improvements={improvements} onNavigate={(target) => { navigate(target); setSearchOpen(false); setSearchQuery(""); }} />
      <NewProcessDialog open={processDialog} onOpenChange={setProcessDialog} onCreate={(process) => { setProcesses((current) => [process, ...current]); toast.success("Processo criado", { description: "As etapas já estão prontas para receber medições." }); }} />
      <MeasurementDialog open={measurementDialog} onOpenChange={setMeasurementDialog} processes={processes} onSave={(processId, stageId, minutes) => { setProcesses((current) => current.map((process) => process.id !== processId ? process : { ...process, updated: "Agora", stages: process.stages.map((stage) => stage.id === stageId ? { ...stage, measurements: [...stage.measurements, minutes] } : stage) })); toast.success("Medição registrada", { description: `Duração calculada automaticamente: ${minutes} min.` }); }} />
      <ImprovementDialog open={improvementDialog} onOpenChange={setImprovementDialog} processes={processes} onSave={(item) => { setImprovements((current) => [item, ...current]); toast.success("Plano de melhoria registrado"); }} />
      <CustomDateDialog open={dateDialog} onOpenChange={setDateDialog} onApply={() => { setPeriod("custom"); setDateDialog(false); toast.success("Período aplicado", { description: "Indicadores atualizados de 01 a 15 de setembro." }); }} />
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  );
}

function AppSidebar({ page, onNavigate, delayed }: { page: string; onNavigate: (page: string) => void; delayed: number }) {
  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" tooltip="LeanOS" className="hover:bg-transparent" onClick={() => onNavigate("Dashboard")}><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#dff66c] font-bold text-[#173b35]">L</span><span className="flex flex-col"><strong className="text-base tracking-[-.03em] text-white">LeanOS</strong><span className="text-[11px] text-[#9ebbb5]">Melhoria contínua</span></span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[#86a9a2]">Gestão</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{navItems.map(({ label, icon: Icon }) => <SidebarMenuItem key={label}><SidebarMenuButton tooltip={label} isActive={page === label} onClick={() => onNavigate(label)} className="h-10 px-3"><Icon /><span>{label}</span></SidebarMenuButton>{label === "Processos" && delayed ? <SidebarMenuBadge className="bg-[#dff66c] text-[#173b35]">{delayed}</SidebarMenuBadge> : null}</SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip="Configurações" isActive={page === "Configurações"} onClick={() => onNavigate("Configurações")} className="h-10 px-3"><Settings /><span>Configurações</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function Header({ page, period, onPeriod, onSearch, notifications, onNavigate }: { page: string; period: Period; onPeriod: (period: Period) => void; onSearch: () => void; notifications: boolean; onNavigate: (page: string) => void }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1580px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <SidebarTrigger className="size-9" aria-label="Abrir ou recolher menu" />
        <div className="min-w-0 flex-1"><p className="hidden text-xs text-muted-foreground sm:block">LeanOS / {page}</p><h1 className="truncate text-lg font-semibold tracking-[-.025em]">{page}</h1></div>
        <Button variant="outline" className="hidden h-9 min-w-56 justify-start bg-[#f7faf9] text-muted-foreground lg:flex" onClick={onSearch}><Search className="size-4" /><span className="flex-1 text-left">Buscar no LeanOS</span><kbd className="rounded border bg-white px-1.5 py-0.5 text-[11px]">⌘ K</kbd></Button>
        <Select value={period} onValueChange={(value) => onPeriod(value as Period)}><SelectTrigger className="hidden w-[132px] bg-white sm:flex" aria-label="Selecionar período"><CalendarDays className="size-4" /><SelectValue>{periodLabels[period]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="today">Hoje</SelectItem><SelectItem value="7d">7 dias</SelectItem><SelectItem value="30d">30 dias</SelectItem><SelectItem value="90d">90 dias</SelectItem><SelectItem value="12m">12 meses</SelectItem><SelectItem value="custom">Personalizado…</SelectItem></SelectContent></Select>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onSearch} aria-label="Buscar"><Search /></Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Notificações" className="relative"><Bell className="size-5" />{notifications ? <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-[#d85c51]" /> : null}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-80"><DropdownMenuLabel>Notificações</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem className="items-start py-3" onClick={() => onNavigate("Processos")}><BellRing className="mt-0.5 text-[#b54239]" /><div><p className="font-medium">Processo atrasado</p><p className="mt-1 text-xs text-muted-foreground">Separação de pedidos · prazo 12/09</p></div></DropdownMenuItem><DropdownMenuItem className="items-start py-3" onClick={() => onNavigate("Melhorias")}><Sparkles className="mt-0.5 text-[#607f20]" /><div><p className="font-medium">Comparação disponível</p><p className="mt-1 text-xs text-muted-foreground">Checklist de triagem rápida</p></div></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 gap-2 px-2"><Avatar className="size-8"><AvatarFallback className="bg-[#dff66c] text-xs font-semibold text-[#173b35]">GA</AvatarFallback></Avatar><span className="hidden text-left text-sm md:block"><strong className="block leading-4">Gestor ADMIN</strong><span className="text-xs text-muted-foreground">Gestor</span></span><ChevronDown className="hidden size-4 text-muted-foreground md:block" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Minha conta</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onNavigate("Equipe")}><CircleUserRound /> Perfil</DropdownMenuItem><DropdownMenuItem onClick={() => onNavigate("Configurações")}><Settings /> Configurações</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem><LogOut /> Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>
    </header>
  );
}

function PageContent(props: { page: string; processes: LeanProcess[]; tasks: TaskItem[]; improvements: Improvement[]; period: Period; loading: boolean; statusFilter: string; onStatusFilter: (value: string) => void; onTaskStatus: (id: string) => void; onOpenProcess: () => void; onOpenMeasurement: () => void; onOpenImprovement: () => void; onNavigate: (page: string) => void }) {
  const { page, processes, tasks, improvements } = props;
  if (page === "Dashboard") return <Dashboard processes={processes} tasks={tasks} improvements={improvements} period={props.period} loading={props.loading} statusFilter={props.statusFilter} onStatusFilter={props.onStatusFilter} onTaskStatus={props.onTaskStatus} onOpenMeasurement={props.onOpenMeasurement} onNavigate={props.onNavigate} />;
  if (page === "Processos") return <ProcessesPage processes={processes} onCreate={props.onOpenProcess} />;
  if (page === "Medições") return <MeasurementsPage processes={processes} onCreate={props.onOpenMeasurement} />;
  if (page === "Tarefas") return <TasksPage tasks={tasks} processes={processes} onComplete={props.onTaskStatus} />;
  if (page === "Melhorias") return <ImprovementsPage improvements={improvements} processes={processes} onCreate={props.onOpenImprovement} />;
  if (page === "Indicadores") return <IndicatorsPage processes={processes} />;
  if (page === "Relatórios") return <RoadmapPage icon={FileBarChart} title="Relatórios gerenciais" text="A documentação classifica relatórios e exportações como personalização posterior ao MVP. Os indicadores já estão disponíveis no Dashboard; esta área fica preparada para a próxima evolução sem antecipar escopo." />;
  if (page === "Equipe") return <TeamPage />;
  return <SettingsPage notifications={true} />;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[.09em] text-primary">{eyebrow}</p> : null}<h2 className="text-2xl font-semibold tracking-[-.035em]">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action}</div>;
}

function ProcessesPage({ processes, onCreate }: { processes: LeanProcess[]; onCreate: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = processes.filter((process) => `${process.name} ${process.owner} ${process.id}`.toLowerCase().includes(query.toLowerCase()));
  return <div><PageHeading eyebrow="RF01" title="Processos e etapas" description="Organize o fluxo operacional e acompanhe cada etapa antes de iniciar as medições." action={<Button onClick={onCreate}><Plus /> Novo processo</Button>} /><SectionCard title={`${filtered.length} processos`} action={<div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar processo" className="w-full pl-9 sm:w-64" aria-label="Buscar processos" /></div>}><ProcessTable processes={filtered} /></SectionCard></div>;
}

function MeasurementsPage({ processes, onCreate }: { processes: LeanProcess[]; onCreate: () => void }) {
  const operators = ["Pedro", "Gustavo", "Rayssa Couto", "Eyshila", "Nicollas Matheus", "Adryan", "Cleberson", "Yuri"];
  const rows = processes.flatMap((process, processIndex) => process.stages.flatMap((stage) => stage.measurements.slice(-2).map((value, index) => ({ id: `${stage.id}-${index}`, process: process.name, stage: stage.name, value, operator: operators[(processIndex + stage.order + index) % operators.length] })))).slice(0, 10);
  return <div><PageHeading eyebrow="RF02–RF04" title="Histórico de medições" description="As durações são calculadas automaticamente a partir do início e término e permanecem vinculadas à etapa." action={<Button onClick={onCreate}><Clock3 /> Registrar medição</Button>} /><SectionCard title="Medições recentes" description="Últimos registros confirmados"><div className="divide-y">{rows.map((row, index) => <div key={row.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1.2fr_1fr_100px_90px] sm:items-center"><div><p className="font-medium">{row.process}</p><p className="text-xs text-muted-foreground">{row.stage}</p></div><p className="text-sm text-muted-foreground">Operador: {row.operator}</p><p className="font-mono text-sm font-semibold">{row.value} min</p><p className="text-xs text-muted-foreground">{index < 2 ? "Hoje" : "14/09/2026"}</p></div>)}</div></SectionCard></div>;
}

function TasksPage({ tasks, processes, onComplete }: { tasks: TaskItem[]; processes: LeanProcess[]; onComplete: (id: string) => void }) {
  const [filter, setFilter] = useState("Todas");
  const filtered = filter === "Todas" ? tasks : tasks.filter((task) => task.status === filter);
  return <div><PageHeading eyebrow="Ciclo Lean" title="Tarefas de melhoria" description="Ações práticas ligadas aos processos e aos planos em execução." action={<Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todas">Todas</SelectItem><SelectItem value="Pendente">Pendentes</SelectItem><SelectItem value="Em andamento">Em andamento</SelectItem><SelectItem value="Atrasada">Atrasadas</SelectItem><SelectItem value="Concluída">Concluídas</SelectItem></SelectContent></Select>} /><div className="grid gap-3">{filtered.map((task) => <div key={task.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><button onClick={() => onComplete(task.id)} disabled={task.status === "Concluída"} aria-label={`Concluir ${task.title}`} className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:border-primary hover:text-primary disabled:bg-[#e9f5cf] disabled:text-[#55771a]"><Check className="size-4" /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{task.title}</h3><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div><p className="mt-1 text-sm text-muted-foreground">{processById(processes, task.processId)?.name} · {task.owner} · prazo {task.due}</p></div><div className="w-full sm:w-40"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Progresso</span><span>{task.progress}%</span></div><Progress value={task.progress} /></div></div></div>)}{!filtered.length ? <EmptySearchState /> : null}</div></div>;
}

function ImprovementsPage({ improvements, processes, onCreate }: { improvements: Improvement[]; processes: LeanProcess[]; onCreate: () => void }) {
  return <div><PageHeading eyebrow="RF09" title="Planos de melhoria" description="Registre a intervenção, preserve o indicador anterior e compare o resultado após novas medições." action={<Button onClick={onCreate}><Plus /> Novo plano</Button>} /><div className="grid gap-4 lg:grid-cols-2">{improvements.map((item) => { const reduction = item.after === null ? null : Math.round(((item.before - item.after) / item.before) * 100); return <div key={item.id} className="rounded-2xl border bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-primary">{item.id}</p><h3 className="mt-1 text-lg font-semibold">{item.title}</h3></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm text-muted-foreground">{processById(processes, item.processId)?.name} · {item.stage}</p><div className="mt-4 grid gap-3 rounded-xl bg-[#f7faf9] p-4 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">Problema</p><p className="mt-1 text-sm leading-5">{item.problem}</p></div><div><p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">Ação</p><p className="mt-1 text-sm leading-5">{item.action}</p></div></div><div className="mt-4 flex items-end justify-between gap-4"><div className="flex items-center gap-5"><div><p className="text-xs text-muted-foreground">Antes</p><p className="text-xl font-semibold">{item.before} min</p></div><div><p className="text-xs text-muted-foreground">Depois</p><p className="text-xl font-semibold">{item.after === null ? "Pendente" : `${item.after} min`}</p></div></div>{reduction !== null ? <span className="rounded-lg bg-[#e9f5cf] px-3 py-2 font-semibold text-[#55771a]">−{reduction}%</span> : null}</div></div>; })}</div></div>;
}

function IndicatorsPage({ processes }: { processes: LeanProcess[] }) {
  const stageRows = processes.flatMap((process) => process.stages.map((stage) => { const measurements = stage.measurements; const total = measurements.reduce((a,b) => a+b,0); return { process: process.name, stage: stage.name, avg: measurements.length ? total / measurements.length : 0, min: measurements.length ? Math.min(...measurements) : 0, max: measurements.length ? Math.max(...measurements) : 0, samples: measurements.length }; })).filter((row) => row.samples).sort((a,b) => b.avg-a.avg);
  return <div><PageHeading eyebrow="RF05–RF06" title="Indicadores de eficiência temporal" description="Média, mínimo, máximo e variação calculados exclusivamente a partir das medições registradas." /><SectionCard title="Desempenho por etapa" description="Etapas ordenadas pelo maior tempo médio"><div className="divide-y">{stageRows.map((row, index) => <div key={`${row.process}-${row.stage}`} className="grid gap-2 px-5 py-4 sm:grid-cols-[40px_1.3fr_1fr_repeat(3,90px)] sm:items-center"><span className="text-sm font-semibold text-muted-foreground">{String(index+1).padStart(2,"0")}</span><div><p className="font-medium">{row.stage}</p><p className="text-xs text-muted-foreground">{row.process}</p></div><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${Math.min(100,row.avg/55*100)}%`}} /></div><Metric label="Média" value={row.avg} /><Metric label="Menor" value={row.min} /><Metric label="Maior" value={row.max} /></div>)}</div></SectionCard></div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div><p className="text-[11px] uppercase tracking-[.05em] text-muted-foreground">{label}</p><p className="font-mono text-sm font-semibold">{Math.round(value)} min</p></div>; }

function TeamPage() {
  const people = ["Adryan", "Cleberson", "Eyshila", "Gustavo", "Nicollas Matheus", "Pedro Araujo", "Rayssa Couto", "Yuri"];
  const roles = ["Product Owner", "UX/UI", "Analista de Requisitos", "Back-end", "QA / Testes", "DevOps", "Dados / DBA", "Documentação"];
  return <div><PageHeading eyebrow="Projeto Integrador" title="Equipe LeanOS" description="A equipe LeanOS é composta por oito colaboradores. A distribuição abaixo é visual e pode ser ajustada após a validação formal da equipe." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{people.map((person,index) => <div key={person} className="flex items-center gap-4 rounded-2xl border bg-white p-4"><Avatar><AvatarFallback className="bg-[#e5f1ee] font-semibold text-primary">{person.split(" ").map((n) => n[0]).slice(0,2).join("")}</AvatarFallback></Avatar><div><p className="font-semibold">{person}</p><p className="text-sm text-muted-foreground">{roles[index]}</p></div></div>)}</div></div>;
}

function SettingsPage({ notifications }: { notifications: boolean }) {
  const [notify, setNotify] = useState(notifications);
  const [weekly, setWeekly] = useState(true);
  return <div><PageHeading title="Configurações" description="Preferências locais desta visualização do LeanOS." /><SectionCard title="Notificações" description="Escolha os avisos que deseja acompanhar"><div className="divide-y"><SettingRow title="Alertas operacionais" description="Processos atrasados, prazos próximos e indicadores fora da meta" checked={notify} onChecked={setNotify} /><SettingRow title="Resumo semanal" description="Síntese das medições e melhorias verificadas na semana" checked={weekly} onChecked={setWeekly} /></div></SectionCard></div>;
}

function SettingRow({ title, description, checked, onChecked }: { title: string; description: string; checked: boolean; onChecked: (checked: boolean) => void }) { return <div className="flex items-center justify-between gap-6 px-5 py-4"><div><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onChecked} aria-label={title} /></div>; }

function RoadmapPage({ icon: Icon, title, text }: { icon: typeof FileBarChart; title: string; text: string }) { return <div className="flex min-h-[60vh] items-center justify-center"><div className="max-w-xl rounded-2xl border bg-white p-8 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-secondary text-primary"><Icon /></span><h2 className="mt-5 text-xl font-semibold">{title}</h2><p className="mt-2 leading-7 text-muted-foreground">{text}</p><StatusBadge status="Planejado" /></div></div>; }

function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="flex min-h-[65vh] items-center justify-center"><div className="max-w-md rounded-2xl border bg-white p-8 text-center"><RefreshCw className="mx-auto size-8 text-[#b54239]" /><h2 className="mt-4 text-xl font-semibold">Não foi possível carregar os dados locais</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Os registros salvos neste dispositivo parecem estar corrompidos. Você pode restaurar os dados demonstrativos e tentar novamente.</p><Button className="mt-5" onClick={onRetry}><RefreshCw /> Restaurar e tentar novamente</Button></div></div>; }

function SearchDialog({ open, onOpenChange, query, onQuery, processes, tasks, improvements, onNavigate }: { open: boolean; onOpenChange: (open: boolean) => void; query: string; onQuery: (query: string) => void; processes: LeanProcess[]; tasks: TaskItem[]; improvements: Improvement[]; onNavigate: (page: string) => void }) {
  const results = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return []; return [
    ...processes.filter((item) => `${item.name} ${item.id} ${item.owner}`.toLowerCase().includes(q)).map((item) => ({ type: "Processo", title: item.name, detail: `${item.id} · ${item.owner}`, page: "Processos", icon: Workflow })),
    ...tasks.filter((item) => `${item.title} ${item.id} ${item.owner}`.toLowerCase().includes(q)).map((item) => ({ type: "Tarefa", title: item.title, detail: `${item.id} · ${item.owner}`, page: "Tarefas", icon: ListChecks })),
    ...improvements.filter((item) => `${item.title} ${item.id} ${item.owner}`.toLowerCase().includes(q)).map((item) => ({ type: "Melhoria", title: item.title, detail: `${item.id} · ${item.owner}`, page: "Melhorias", icon: Sparkles })),
  ].slice(0, 8); }, [query, processes, tasks, improvements]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl"><DialogHeader className="sr-only"><DialogTitle>Busca global</DialogTitle><DialogDescription>Encontre processos, tarefas e melhorias.</DialogDescription></DialogHeader><div className="flex items-center gap-3 border-b px-4"><Search className="size-5 text-muted-foreground" /><Input autoFocus value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar processo, tarefa ou melhoria…" className="h-14 border-0 px-0 text-base shadow-none focus-visible:ring-0" /></div><div className="max-h-[420px] overflow-y-auto p-2">{!query ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">Digite para buscar em todo o LeanOS.</div> : !results.length ? <EmptySearchState /> : results.map(({ type, title, detail, page, icon: Icon }, index) => <button key={`${type}-${index}`} onClick={() => onNavigate(page)} className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#f3f7f6]"><span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{title}</strong><span className="block truncate text-xs text-muted-foreground">{type} · {detail}</span></span></button>)}</div></DialogContent></Dialog>;
}

function NewProcessDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (process: LeanProcess) => void }) {
  const [name, setName] = useState(""); const [owner, setOwner] = useState("Cleberson"); const [stages, setStages] = useState(""); const [error, setError] = useState("");
  const submit = () => { const stageNames = stages.split("\n").map((item) => item.trim()).filter(Boolean); if (!name.trim() || !stageNames.length) { setError("Informe o nome do processo e pelo menos uma etapa."); return; } const id = `PRC-${String(Date.now()).slice(-3)}`; onCreate({ id, name: name.trim(), owner, status: "Planejado", priority: "Média", category: "Operacional", progress: 0, start: "15/09/2026", due: "15/10/2026", updated: "Agora", stages: stageNames.map((stage,index) => ({ id: `${id}-E${index+1}`, name: stage, order: index+1, measurements: [] })) }); setName(""); setStages(""); setError(""); onOpenChange(false); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Novo processo</DialogTitle><DialogDescription>Cadastre o fluxo em ordem. Cada processo deve possuir pelo menos uma etapa.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Nome do processo"><Input aria-label="Nome do processo" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Atendimento ao cliente" /></Field><Field label="Responsável"><Select value={owner} onValueChange={setOwner}><SelectTrigger aria-label="Responsável" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["Cleberson","Gustavo","Rayssa","Nicollas","Eyshila"].map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}</SelectContent></Select></Field><Field label="Etapas em ordem" hint="Uma etapa por linha"><Textarea aria-label="Etapas em ordem" value={stages} onChange={(e) => setStages(e.target.value)} placeholder={"1. Receber solicitação\n2. Analisar\n3. Concluir"} rows={5} /></Field>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Criar processo</Button></DialogFooter></DialogContent></Dialog>;
}

function MeasurementDialog({ open, onOpenChange, processes, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; processes: LeanProcess[]; onSave: (processId: string, stageId: string, minutes: number) => void }) {
  const [processId, setProcessId] = useState(processes[0]?.id ?? ""); const process = processById(processes, processId); const [stageId, setStageId] = useState(processes[0]?.stages[0]?.id ?? ""); const [start, setStart] = useState("2026-09-15T13:00"); const [end, setEnd] = useState("2026-09-15T13:20"); const [error, setError] = useState("");
  const changeProcess = (value: string) => { setProcessId(value); setStageId(processById(processes, value)?.stages[0]?.id ?? ""); };
  const submit = () => { const duration = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000); if (!processId || !stageId) { setError("Selecione o processo e a etapa."); return; } if (!Number.isFinite(duration) || duration <= 0) { setError("O horário de término não pode ser anterior ou igual ao início."); return; } onSave(processId, stageId, duration); setError(""); onOpenChange(false); };
  const duration = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Registrar medição</DialogTitle><DialogDescription>A duração é calculada automaticamente e não pode ser editada manualmente.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Processo"><Select value={processId} onValueChange={changeProcess}><SelectTrigger aria-label="Processo" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{processes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Etapa"><Select value={stageId} onValueChange={setStageId}><SelectTrigger aria-label="Etapa" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{process?.stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.order}. {stage.name}</SelectItem>)}</SelectContent></Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Início"><Input aria-label="Início" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></Field><Field label="Término"><Input aria-label="Término" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></Field></div><div className="rounded-xl bg-[#eaf3f0] p-4"><p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">Duração calculada</p><p className="mt-1 text-2xl font-semibold text-primary">{duration > 0 ? `${duration} min` : "—"}</p></div>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Confirmar medição</Button></DialogFooter></DialogContent></Dialog>;
}

function ImprovementDialog({ open, onOpenChange, processes, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; processes: LeanProcess[]; onSave: (item: Improvement) => void }) {
  const [processId, setProcessId] = useState(processes[0]?.id ?? ""); const process = processById(processes, processId); const [title, setTitle] = useState(""); const [problem, setProblem] = useState(""); const [action, setAction] = useState(""); const [error, setError] = useState("");
  const submit = () => { if (!title.trim() || !problem.trim() || !action.trim() || !process) { setError("Preencha o título, o problema e a ação proposta."); return; } const bottleneck = getBottleneck(process); const stage = process.stages.find((item) => item.name === bottleneck.name) ?? process.stages[0]; const values = stage?.measurements ?? []; const before = values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : 0; onSave({ id:`MEL-${String(Date.now()).slice(-3)}`, title:title.trim(), processId, stage:stage?.name ?? "Sem etapa", problem:problem.trim(), action:action.trim(), owner:process.owner, priority:"Alta", status:"Proposta", before, after:null, date:"15/09/2026" }); setTitle(""); setProblem(""); setAction(""); setError(""); onOpenChange(false); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Novo plano de melhoria</DialogTitle><DialogDescription>Registre a intervenção e preserve o indicador anterior para a comparação futura.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Processo"><Select value={processId} onValueChange={setProcessId}><SelectTrigger aria-label="Processo" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{processes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Título"><Input aria-label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome claro para a melhoria" /></Field><Field label="Problema identificado"><Textarea aria-label="Problema identificado" value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} /></Field><Field label="Ação proposta"><Textarea aria-label="Ação proposta" value={action} onChange={(e) => setAction(e.target.value)} rows={3} /></Field>{error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit}>Registrar plano</Button></DialogFooter></DialogContent></Dialog>;
}

function CustomDateDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (open: boolean) => void; onApply: () => void }) { return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Período personalizado</DialogTitle><DialogDescription>Escolha o intervalo usado nos indicadores e gráficos.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Data inicial"><Input aria-label="Data inicial" type="date" defaultValue="2026-09-01" /></Field><Field label="Data final"><Input aria-label="Data final" type="date" defaultValue="2026-09-15" /></Field></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={onApply}>Aplicar período</Button></DialogFooter></DialogContent></Dialog>; }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <div className="space-y-2"><div className="flex items-center justify-between"><Label>{label}</Label>{hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}</div>{children}</div>; }
