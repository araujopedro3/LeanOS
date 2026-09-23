"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Bell, BellRing, CalendarDays, Check, ChevronDown, CircleUserRound, Clock3, FileBarChart, LayoutDashboard, ListChecks, LogOut, Plus, RefreshCw, Search, Settings, Sparkles, TimerReset, UsersRound, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { processById, type Improvement, type LeanProcess, type Period, type TaskItem } from "@/lib/leanos-data";
import { EmptySearchState } from "./empty-search-state";
const Dashboard = lazy(() => import("./dashboard").then((module) => ({ default: module.Dashboard })));
import { PriorityBadge, StatusBadge } from "./badges";
import { CompanySettings } from "./company-settings";
import { AuthScreen } from "./auth-screen";
import { NewTaskDialog, NewEmployeeDialog, NewProcessDialog, MeasurementDialog, ImprovementDialog, ImprovementActions, CustomDateDialog } from "./company-dialogs";
import { ProcessTable } from "./process-table";
import { hashPassword, isPasswordHash, verifyPassword } from "@/lib/leanos-password";
import { useWorkspace } from "@/hooks/use-workspace";
import { DomainError, processStatus, taskStatus } from "@/lib/leanos-domain";
import { SectionCard } from "./section-card";
import { readWorkspace, writeWorkspace, newId, localDate, displayDate, validateEmployees, type WorkspaceChanges, type Workspace, type EmployeeDraft, type SessionUser } from "@/lib/leanos-storage";

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
  const { processes: storedProcesses, tasks: storedTasks, improvements, employees, sessionUser, companyProfile, workspace, loading, loadError, conflict, commitChanges, enterSession, logout, reload } = useWorkspace();
  const processes = sessionUser?.role === "company" ? storedProcesses.map((process) => ({ ...process, status: processStatus(process, localDate()) })) : storedProcesses;
  const tasks = sessionUser?.role === "company" ? storedTasks.map((task) => ({ ...task, status: taskStatus(task, localDate()) })) : storedTasks;
  const [selectedPage, setPage] = useState("Dashboard");
  const page = selectedPage === "Dashboard" && sessionUser?.role === "company" ? "Empresa" : selectedPage;
  const [period, setPeriod] = useState<Period>("30d");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [processDialog, setProcessDialog] = useState(false);
  const [measurementDialog, setMeasurementDialog] = useState(false);
  const [improvementDialog, setImprovementDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [employeeDialog, setEmployeeDialog] = useState(false);
  const [dateDialog, setDateDialog] = useState(false);
  const [notifications] = useState(true);
  const authRequest = useRef(0);
  const processesRef = useRef(processes);
  const tasksRef = useRef(tasks);
  const commitRef = useRef<(changes: WorkspaceChanges | ((records: Pick<Workspace, "processes" | "tasks" | "improvements" | "employees">) => WorkspaceChanges)) => boolean>(() => false);

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
          if (!commitRef.current((current) => ({ tasks: current.tasks.map((item) => item.id === taskId ? { ...item, status: "Concluída", progress: 100 } : item) }))) throw new Error("Não foi possível salvar a tarefa.");
          return { taskId, status: "completed" };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  useEffect(() => { commitRef.current = commitChanges; });
  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && sessionUser) {
        event.preventDefault(); setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, [sessionUser]);


  const navigate = (target: string) => {
    setPage(target === "Dashboard" && sessionUser?.role === "company" ? "Empresa" : target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markTaskComplete = (id: string) => {
    if (!commitChanges((current) => ({ tasks: current.tasks.map((task) => task.id === id ? { ...task, status: "Concluída", progress: 100 } : task) }))) return;
    toast.success("Tarefa concluída", { description: "O progresso foi atualizado no painel." });
  };

  const resetSessionState = () => {
    authRequest.current += 1;
    setSearchOpen(false);
    setDateDialog(false);
    setSearchQuery("");
    setStatusFilter("Todos");
    setProcessDialog(false);
    setTaskDialog(false);
    setMeasurementDialog(false);
    setImprovementDialog(false);
    setEmployeeDialog(false);
  };

  const allowAccess = sessionUser !== null;

  if (!allowAccess) {
    return (
      <AuthScreen
        onCancelAuth={() => { authRequest.current += 1; }}
        companyProfile={companyProfile}
        employees={employees}
        onAdminLogin={(login, password) => {
          if (login.trim() !== "ADM" || password !== "123") return false;
          const nextUser: SessionUser = { role: "admin", companyName: "ADM" };
          resetSessionState();
          setPage("Dashboard");
          enterSession(nextUser);
          return true;
        }}
        onCompanyLogin={async (companyNameInput, password) => {
          const request = ++authRequest.current;
          const workspace = readWorkspace(window.localStorage, companyNameInput.trim());
          if (!workspace || !await verifyPassword(password, workspace.profile.senha)) return false;
          if (!isPasswordHash(workspace.profile.senha)) workspace.profile.senha = await hashPassword(password);
          workspace.employees = await Promise.all(workspace.employees.map(async (employee) => ({ ...employee, senha: isPasswordHash(employee.senha) ? employee.senha : await hashPassword(employee.senha) })));
          if (request !== authRequest.current) return false;
          const latest = readWorkspace(window.localStorage, workspace.profile.nome);
          if (!latest) throw new DomainError("Empresa não encontrada.");
          writeWorkspace(window.localStorage, { ...latest, profile: { ...latest.profile, senha: workspace.profile.senha }, employees: latest.employees.map((employee) => ({ ...employee, senha: workspace.employees.find((secured) => secured.email === employee.email && secured.nome === employee.nome)?.senha ?? employee.senha })) });
          const nextUser: SessionUser = { role: "company", companyName: workspace.profile.nome };
          resetSessionState();
          setPage("Empresa");
          enterSession(nextUser);
          return true;
        }}
        onCompanyRegister={async (profile, employeeList) => {
          const request = ++authRequest.current;
          if (readWorkspace(window.localStorage, profile.nome)) throw new Error("Esta empresa já está cadastrada. Use a opção Entrar.");
          validateEmployees(employeeList);
          const securedProfile = { ...profile, senha: await hashPassword(profile.senha) };
          const securedEmployees = await Promise.all(employeeList.map(async (employee) => ({ ...employee, nome: employee.nome.trim(), cargo: employee.cargo.trim(), email: employee.email.trim().toLowerCase(), senha: await hashPassword(employee.senha) })));
          if (request !== authRequest.current) return false;
          if (readWorkspace(window.localStorage, profile.nome)) throw new DomainError("Esta empresa já está cadastrada. Use a opção Entrar.");
          writeWorkspace(window.localStorage, { profile: securedProfile, employees: securedEmployees, processes: [], tasks: [], improvements: [] });
          const nextUser: SessionUser = { role: "company", companyName: profile.nome };
          resetSessionState();
          setPage("Empresa");
          enterSession(nextUser);
          return true;
        }}
      />
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar page={page} onNavigate={navigate} delayed={processes.filter((process) => process.status === "Atrasado").length} />
      <SidebarInset className="min-w-0">
        <Header
          processes={processes}
          page={page}
          period={period}
          user={sessionUser}
          onLogout={() => {
            if (!logout()) return;
            setPage("Dashboard");
            resetSessionState();
          }}
          onPeriod={(value) => value === "custom" ? setDateDialog(true) : setPeriod(value)}
          onSearch={() => setSearchOpen(true)}
          notifications={notifications}
          onNavigate={navigate}
        />
        <div className="mx-auto w-full max-w-[1580px] px-4 py-5 sm:px-6 lg:px-8">
          {conflict ? <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">Outra aba alterou os dados desta empresa. Seus formulários continuam abertos.<Button variant="outline" className="ml-3" onClick={reload}>Recarregar dados</Button></div> : null}
          {loadError ? (
            <ErrorState onRetry={reload} />
          ) : loading ? <p role="status" className="p-8 text-muted-foreground">Carregando dados…</p> : page === "Configurações" && workspace ? <CompanySettings key={workspace.profile.nome} workspace={workspace} onRestore={commitChanges} /> : (
            <Suspense fallback={<p role="status">Carregando painel…</p>}><PageContent
              page={page}
              role={sessionUser.role}
              companyName={sessionUser?.role === "company" ? sessionUser.companyName : companyProfile?.nome ?? "Empresa"}
              processes={processes}
              tasks={tasks}
              improvements={improvements}
              employees={employees}
              period={period}
              loading={loading}
              statusFilter={statusFilter}
              onStatusFilter={setStatusFilter}
              onTaskStatus={markTaskComplete}
              onImprovementUpdate={(item) => commitChanges((current) => ({ improvements: current.improvements.map((saved) => saved.id === item.id ? item : saved) }))}
              onOpenProcess={() => setProcessDialog(true)}
              onProcessUpdate={(process) => commitChanges((current) => ({ processes: current.processes.map((saved) => saved.id === process.id ? process : saved) }))}
              onOpenMeasurement={() => processes.length ? setMeasurementDialog(true) : toast.error("Cadastre um processo com etapas antes de registrar medições.")}
              onOpenImprovement={() => processes.length ? setImprovementDialog(true) : toast.error("Cadastre um processo antes de criar uma melhoria.")}
              onOpenTask={() => processes.length ? setTaskDialog(true) : toast.error("Cadastre um processo antes de criar uma tarefa.")}
              onOpenEmployee={() => setEmployeeDialog(true)}
              onNavigate={navigate}
            /></Suspense>
          )}
        </div>
      </SidebarInset>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} query={searchQuery} onQuery={setSearchQuery} processes={processes} tasks={tasks} improvements={improvements} onNavigate={(target) => { navigate(target); setSearchOpen(false); setSearchQuery(""); }} />
      {processDialog && <NewProcessDialog isAdmin={sessionUser.role === "admin"} open={processDialog} onOpenChange={setProcessDialog} employees={employees} onCreate={(process) => { if (!commitChanges((current) => ({ processes: [process, ...current.processes] }))) return false; toast.success("Processo criado", { description: "As etapas já estão prontas para receber medições." }); }} />}
      {measurementDialog && <MeasurementDialog open={measurementDialog} onOpenChange={setMeasurementDialog} processes={processes} onSave={(processId, stageId, minutes, start, end) => { if (!commitChanges((current) => ({ processes: current.processes.map((process) => process.id !== processId ? process : { ...process, updated: "Agora", stages: process.stages.map((stage) => stage.id === stageId ? { ...stage, measurements: [...stage.measurements, minutes], records: [...(stage.records ?? []), { id: newId("MED"), start, end, minutes, operator: process.owner }] } : stage) }) }))) return false; toast.success("Medição registrada", { description: `Duração calculada automaticamente: ${minutes} min.` }); }} />}
      {improvementDialog && <ImprovementDialog isAdmin={sessionUser.role === "admin"} open={improvementDialog} onOpenChange={setImprovementDialog} processes={processes} onSave={(item) => { if (!commitChanges((current) => ({ improvements: [item, ...current.improvements] }))) return false; toast.success("Plano de melhoria registrado"); }} />}
      {taskDialog && <NewTaskDialog open={taskDialog} onOpenChange={setTaskDialog} processes={processes} employees={employees} onCreate={(task) => { if (!commitChanges((current) => ({ tasks: [task, ...current.tasks] }))) return false; toast.success("Tarefa criada"); }} />}
      {employeeDialog && <NewEmployeeDialog open={employeeDialog} onOpenChange={setEmployeeDialog} onCreate={async (employee) => {
        validateEmployees([...employees, employee]);
        const securedEmployee = { ...employee, senha: await hashPassword(employee.senha) };
        if (!commitChanges((current) => { validateEmployees([...current.employees, securedEmployee]); return { employees: [securedEmployee, ...current.employees] }; })) throw new Error("Não foi possível salvar o funcionário.");
        toast.success("Funcionário adicionado");
      }} />}
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

function Header({
  processes,
  page,
  period,
  user,
  onPeriod,
  onSearch,
  notifications,
  onNavigate,
  onLogout,
}: {
  processes: LeanProcess[];
  page: string;
  period: Period;
  user: SessionUser | null;
  onPeriod: (period: Period) => void;
  onSearch: () => void;
  notifications: boolean;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}) {
  const profileName = user?.role === "admin" ? "Gestor ADMIN" : user?.companyName ?? "Empresa";
  const profileRole = user?.role === "admin" ? "Gestor" : "Empresa";
  const initials = user?.role === "admin" ? "ADM" : (user?.companyName ?? "EMP").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1580px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <SidebarTrigger className="size-9" aria-label="Abrir ou recolher menu" />
        <div className="min-w-0 flex-1"><p className="hidden text-xs text-muted-foreground sm:block">LeanOS / {page}</p><h1 className="truncate text-lg font-semibold tracking-[-.025em]">{page}</h1></div>
        <Button variant="outline" className="hidden h-9 min-w-56 justify-start bg-[#f7faf9] text-muted-foreground lg:flex" onClick={onSearch}><Search className="size-4" /><span className="flex-1 text-left">Buscar no LeanOS</span><kbd className="rounded border bg-white px-1.5 py-0.5 text-[11px]">⌘ K</kbd></Button>
        {user?.role === "admin" ? <Select value={period} onValueChange={(value) => onPeriod(value as Period)}><SelectTrigger className="hidden w-[132px] bg-white sm:flex" aria-label="Selecionar período"><CalendarDays className="size-4" /><SelectValue>{periodLabels[period]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="today">Hoje</SelectItem><SelectItem value="7d">7 dias</SelectItem><SelectItem value="30d">30 dias</SelectItem><SelectItem value="90d">90 dias</SelectItem><SelectItem value="12m">12 meses</SelectItem><SelectItem value="custom">Personalizado…</SelectItem></SelectContent></Select> : null}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onSearch} aria-label="Buscar"><Search /></Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Notificações" className="relative"><Bell className="size-5" />{notifications && (user?.role === "admin" || processes.some((process) => process.status === "Atrasado")) ? <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-[#d85c51]" /> : null}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-80"><DropdownMenuLabel>Notificações</DropdownMenuLabel><DropdownMenuSeparator />{user?.role === "admin" ? <><DropdownMenuItem className="items-start py-3" onClick={() => onNavigate("Processos")}><BellRing className="mt-0.5 text-[#b54239]" /><div><p className="font-medium">Processo atrasado</p><p className="mt-1 text-xs text-muted-foreground">Separação de pedidos · prazo 12/09</p></div></DropdownMenuItem><DropdownMenuItem className="items-start py-3" onClick={() => onNavigate("Melhorias")}><Sparkles className="mt-0.5 text-[#607f20]" /><div><p className="font-medium">Comparação disponível</p><p className="mt-1 text-xs text-muted-foreground">Checklist de triagem rápida</p></div></DropdownMenuItem></> : processes.filter((process) => process.status === "Atrasado").length ? processes.filter((process) => process.status === "Atrasado").map((process) => <DropdownMenuItem key={process.id} onClick={() => onNavigate("Processos")}>{process.name} · prazo {displayDate(process.due)}</DropdownMenuItem>) : <DropdownMenuItem disabled>Nenhuma notificação</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 gap-2 px-2"><Avatar className="size-8"><AvatarFallback className="bg-[#dff66c] text-xs font-semibold text-[#173b35]">{initials}</AvatarFallback></Avatar><span className="hidden text-left text-sm md:block"><strong className="block leading-4">{profileName}</strong><span className="text-xs text-muted-foreground">{profileRole}</span></span><ChevronDown className="hidden size-4 text-muted-foreground md:block" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Minha conta</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onNavigate("Equipe")}><CircleUserRound /> Perfil</DropdownMenuItem><DropdownMenuItem onClick={() => onNavigate("Configurações")}><Settings /> Configurações</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={onLogout}><LogOut /> Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>
    </header>
  );
}

function PageContent(props: { page: string; role: SessionUser["role"]; companyName: string; processes: LeanProcess[]; tasks: TaskItem[]; improvements: Improvement[]; employees: EmployeeDraft[]; period: Period; loading: boolean; statusFilter: string; onStatusFilter: (value: string) => void; onTaskStatus: (id: string) => void; onImprovementUpdate: (item: Improvement) => void | boolean; onOpenProcess: () => void; onProcessUpdate: (process: LeanProcess) => boolean; onOpenMeasurement: () => void; onOpenImprovement: () => void; onOpenTask: () => void; onOpenEmployee: () => void; onNavigate: (page: string) => void }) {
  const { page, role, processes, tasks, improvements, companyName, employees } = props;
  const isAdmin = role === "admin";
  if (page === "Empresa") return <CompanyStartPage companyName={companyName} processes={processes} tasks={tasks} improvements={improvements} onNavigate={props.onNavigate} />;
  if (page === "Dashboard") return <Dashboard processes={processes} tasks={tasks} improvements={improvements} period={props.period} loading={props.loading} statusFilter={props.statusFilter} onStatusFilter={props.onStatusFilter} onTaskStatus={props.onTaskStatus} onOpenMeasurement={props.onOpenMeasurement} onNavigate={props.onNavigate} />;
  if (page === "Processos") return <ProcessesPage processes={processes} isAdmin={isAdmin} onCreate={props.onOpenProcess} onUpdate={props.onProcessUpdate} onNavigate={props.onNavigate} />;
  if (page === "Medições") return <MeasurementsPage processes={processes} isAdmin={isAdmin} onCreate={props.onOpenMeasurement} />;
  if (page === "Tarefas") return <TasksPage tasks={tasks} processes={processes} isAdmin={isAdmin} onCreate={props.onOpenTask} onComplete={props.onTaskStatus} />;
  if (page === "Melhorias") return <ImprovementsPage improvements={improvements} processes={processes} isAdmin={isAdmin} onCreate={props.onOpenImprovement} onUpdate={props.onImprovementUpdate} />;
  if (page === "Indicadores") return <IndicatorsPage processes={processes} isAdmin={isAdmin} />;
  if (page === "Relatórios") return <RoadmapPage icon={FileBarChart} title="Relatórios gerenciais" text="A documentação classifica relatórios e exportações como personalização posterior ao MVP. Os indicadores já estão disponíveis no Dashboard; esta área fica preparada para a próxima evolução sem antecipar escopo." />;
  if (page === "Equipe") return <TeamPage employees={employees} isAdmin={isAdmin} onAdd={props.onOpenEmployee} />;
  return <SettingsPage notifications={true} />;
}

function CompanyStartPage({ companyName, processes, tasks, improvements, onNavigate }: { companyName: string; processes: LeanProcess[]; tasks: TaskItem[]; improvements: Improvement[]; onNavigate: (page: string) => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border border-dashed border-[#dfe8e5] bg-[#f7faf9] p-10 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#3d5b57]">Painel da empresa</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#173b35]">{companyName}</h2>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{processes.length ? `${processes.length} processos · ${tasks.filter((task) => task.status !== "Concluída").length} tarefas abertas · ${improvements.length} planos de melhoria` : "Comece cadastrando um processo. Depois, registre medições, tarefas e melhorias."}</p>
        <Button className="mt-6 bg-[#173b35] text-white hover:bg-[#214b46]" onClick={() => onNavigate(processes.length ? "Tarefas" : "Processos")}>{processes.length ? "+ Nova tarefa" : "+ Novo processo"}</Button>
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[.09em] text-primary">{eyebrow}</p> : null}<h2 className="text-2xl font-semibold tracking-[-.035em]">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action}</div>;
}

function ProcessesPage({ processes, isAdmin, onCreate, onUpdate, onNavigate }: { processes: LeanProcess[]; isAdmin: boolean; onCreate: () => void; onUpdate: (process: LeanProcess) => boolean; onNavigate: (page: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = processes.filter((process) => `${process.name} ${process.owner} ${process.id}`.toLowerCase().includes(query.toLowerCase()));

  if (!processes.length) {
    return (
      <div>
        <PageHeading
          eyebrow="RF01"
          title="Processos e etapas"
          description="Organize o fluxo operacional e acompanhe cada etapa antes de iniciar as medições."
          action={<Button onClick={onCreate}><Plus /> Novo processo</Button>}
        />

        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-2xl rounded-3xl border border-dashed border-[#dfe8e5] bg-[#f7faf9] p-10 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#3d5b57]">Processos</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#173b35]">Nenhum processo cadastrado</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Ainda não há informações registradas aqui. Comece criando um novo processo para organizar as etapas da operação.
            </p>
            <Button className="mt-6 bg-[#173b35] text-white hover:bg-[#214b46]" onClick={onCreate}>
              <Plus /> Novo processo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <div><PageHeading eyebrow="RF01" title="Processos e etapas" description="Organize o fluxo operacional e acompanhe cada etapa antes de iniciar as medições." action={<Button onClick={onCreate}><Plus /> Novo processo</Button>} /><SectionCard title={`${filtered.length} processos`} action={<div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar processo" className="w-full pl-9 sm:w-64" aria-label="Buscar processos" /></div>}><ProcessTable processes={filtered} onUpdate={isAdmin ? undefined : onUpdate} onOpenImprovements={isAdmin ? undefined : () => onNavigate("Melhorias")} /></SectionCard></div>;
}

function MeasurementsPage({ processes, isAdmin, onCreate }: { processes: LeanProcess[]; isAdmin: boolean; onCreate: () => void }) {
  const operators = ["Pedro", "Gustavo", "Rayssa Couto", "Eyshila", "Nicollas Matheus", "Adryan", "Cleberson", "Yuri"];
  const rows = isAdmin
    ? processes.flatMap((process, processIndex) => process.stages.flatMap((stage) => stage.measurements.slice(-2).map((value, index) => ({ id: `${stage.id}-${index}`, process: process.name, stage: stage.name, value, operator: operators[(processIndex + stage.order + index) % operators.length], date: "" })))).slice(0, 10)
    : processes.flatMap((process) => process.stages.flatMap((stage) => stage.measurements.map((value, index) => {
      const record = stage.records?.[index - (stage.measurements.length - (stage.records?.length ?? 0))];
      return { id: record?.id ?? `${process.id}-${stage.id}-${index}`, process: process.name, stage: stage.name, value, operator: record?.operator ?? process.owner, date: record?.end ?? "" };
    }))).sort((a, b) => b.date.localeCompare(a.date));

  if (!rows.length) {
    return (
      <div>
        <PageHeading
          eyebrow="RF02–RF04"
          title="Histórico de medições"
          description="As durações são calculadas automaticamente a partir do início e término e permanecem vinculadas à etapa."
          action={<Button onClick={onCreate}><Clock3 /> Registrar medição</Button>}
        />

        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-2xl rounded-3xl border border-dashed border-[#dfe8e5] bg-[#f7faf9] p-10 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#3d5b57]">Medições</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#173b35]">Nenhuma medição registrada</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Ainda não há informações registradas aqui. Registre uma medição para acompanhar o tempo de cada etapa.
            </p>
            <Button className="mt-6 bg-[#173b35] text-white hover:bg-[#214b46]" onClick={onCreate}>
              <Clock3 /> Registrar medição
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <div><PageHeading eyebrow="RF02–RF04" title="Histórico de medições" description="As durações são calculadas automaticamente a partir do início e término e permanecem vinculadas à etapa." action={<Button onClick={onCreate}><Clock3 /> Registrar medição</Button>} /><SectionCard title="Medições recentes" description="Últimos registros confirmados"><div className="divide-y">{rows.map((row, index) => <div key={row.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1.2fr_1fr_100px_90px] sm:items-center"><div><p className="font-medium">{row.process}</p><p className="text-xs text-muted-foreground">{row.stage}</p></div><p className="text-sm text-muted-foreground">Operador: {row.operator}</p><p className="font-mono text-sm font-semibold">{row.value} min</p><p className="text-xs text-muted-foreground">{isAdmin ? (index < 2 ? "Hoje" : "14/09/2026") : row.date ? new Date(row.date).toLocaleString("pt-BR") : "Data não registrada"}</p></div>)}</div></SectionCard></div>;
}

function TasksPage({ tasks, processes, onCreate, onComplete }: { tasks: TaskItem[]; processes: LeanProcess[]; isAdmin: boolean; onCreate: () => void; onComplete: (id: string) => void }) {
  const [filter, setFilter] = useState("Todas");
  const filtered = filter === "Todas" ? tasks : tasks.filter((task) => task.status === filter);

  if (!tasks.length) {
    return (
      <div>
        <PageHeading
          eyebrow="Ciclo Lean"
          title="Tarefas de melhoria"
          description="Ações práticas ligadas aos processos e aos planos em execução."
          action={<Button onClick={onCreate}><Plus /> Nova tarefa</Button>}
        />

        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-2xl rounded-3xl border border-dashed border-[#dfe8e5] bg-[#f7faf9] p-10 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#3d5b57]">Tarefas</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#173b35]">Nenhuma tarefa cadastrada</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Ainda não há informações registradas aqui. Comece criando uma nova tarefa para organizar a operação.
            </p>
            <Button className="mt-6 bg-[#173b35] text-white hover:bg-[#214b46]" onClick={onCreate}>
              <Plus /> Nova tarefa
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <div><PageHeading eyebrow="Ciclo Lean" title="Tarefas de melhoria" description="Ações práticas ligadas aos processos e aos planos em execução." action={<div className="flex gap-2"><Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todas">Todas</SelectItem><SelectItem value="Pendente">Pendentes</SelectItem><SelectItem value="Em andamento">Em andamento</SelectItem><SelectItem value="Atrasada">Atrasadas</SelectItem><SelectItem value="Concluída">Concluídas</SelectItem></SelectContent></Select><Button onClick={onCreate}><Plus /> Nova tarefa</Button></div>} /><div className="grid gap-3">{!filtered.length ? <EmptySearchState /> : null}{filtered.map((task) => <div key={task.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><button onClick={() => onComplete(task.id)} disabled={task.status === "Concluída"} aria-label={`Concluir ${task.title}`} className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-full border text-muted-foreground"><Check className="size-4" /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{task.title}</h3><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div><p className="mt-1 text-sm text-muted-foreground">{processById(processes, task.processId)?.name} · {task.owner} · prazo {displayDate(task.due)}</p></div><div className="w-full sm:w-40"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Progresso</span><span>{task.progress}%</span></div><Progress value={task.progress} /></div></div></div>)}</div></div>;
}

function ImprovementsPage({ improvements, processes, isAdmin, onCreate, onUpdate }: { improvements: Improvement[]; processes: LeanProcess[]; isAdmin: boolean; onCreate: () => void; onUpdate: (item: Improvement) => void | boolean }) {
  if (!improvements.length) {
    return (
      <div>
        <PageHeading
          eyebrow="RF09"
          title="Planos de melhoria"
          description="Registre a intervenção, preserve o indicador anterior e compare o resultado após novas medições."
          action={<Button onClick={onCreate}><Plus /> Novo plano</Button>}
        />

        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-2xl rounded-3xl border border-dashed border-[#dfe8e5] bg-[#f7faf9] p-10 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#3d5b57]">Melhorias</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#173b35]">Nenhum plano cadastrado</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Ainda não há informações registradas aqui. Comece criando um novo plano de melhoria para a operação.
            </p>
            <Button className="mt-6 bg-[#173b35] text-white hover:bg-[#214b46]" onClick={onCreate}>
              <Plus /> Novo plano
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <div><PageHeading eyebrow="RF09" title="Planos de melhoria" description="Registre a intervenção, preserve o indicador anterior e compare o resultado após novas medições." action={<Button onClick={onCreate}><Plus /> Novo plano</Button>} /><div className="grid gap-4 lg:grid-cols-2">{improvements.map((item) => { const reduction = item.after === null || item.before <= 0 ? null : Math.round(((item.before - item.after) / item.before) * 100); return <div key={item.id} className="rounded-2xl border bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-primary">{item.id}</p><h3 className="mt-1 text-lg font-semibold">{item.title}</h3></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm text-muted-foreground">{processById(processes, item.processId)?.name} · {item.stage}</p><div className="mt-4 grid gap-3 rounded-xl bg-[#f7faf9] p-4 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">Problema</p><p className="mt-1 text-sm leading-5">{item.problem}</p></div><div><p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">Ação</p><p className="mt-1 text-sm leading-5">{item.action}</p></div></div><div className="mt-4 flex items-end justify-between gap-4"><div className="flex items-center gap-5"><div><p className="text-xs text-muted-foreground">Antes</p><p className="text-xl font-semibold">{item.before} min</p></div><div><p className="text-xs text-muted-foreground">Depois</p><p className="text-xl font-semibold">{item.after === null ? "Pendente" : `${item.after} min`}</p></div></div>{reduction !== null ? <span className="rounded-lg bg-[#e9f5cf] px-3 py-2 font-semibold text-[#55771a]">{isAdmin ? `−${reduction}%` : `${reduction < 0 ? "+" : "−"}${Math.abs(reduction)}%`}</span> : null}</div>{!isAdmin ? <ImprovementActions item={item} process={processById(processes, item.processId)} onUpdate={onUpdate} /> : null}</div>; })}</div></div>;
}

function IndicatorsPage({ processes }: { processes: LeanProcess[]; isAdmin: boolean }) {
  const stageRows = processes.flatMap((process) => process.stages.map((stage) => { const measurements = stage.measurements; const total = measurements.reduce((a,b) => a+b,0); return { process: process.name, stage: stage.name, avg: measurements.length ? total / measurements.length : 0, min: measurements.length ? Math.min(...measurements) : 0, max: measurements.length ? Math.max(...measurements) : 0, samples: measurements.length }; })).filter((row) => row.samples).sort((a,b) => b.avg-a.avg);

  if (!stageRows.length) {
    return (
      <div>
        <PageHeading
          eyebrow="RF05–RF06"
          title="Indicadores de eficiência temporal"
          description="Média, mínimo, máximo e variação calculados exclusivamente a partir das medições registradas."
        />

        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-full max-w-2xl rounded-3xl border border-dashed border-[#dfe8e5] bg-[#f7faf9] p-10 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#3d5b57]">Indicadores</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#173b35]">Nenhum indicador disponível</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Os indicadores aparecerão aqui depois que novas medições forem registradas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <div><PageHeading eyebrow="RF05–RF06" title="Indicadores de eficiência temporal" description="Média, mínimo, máximo e variação calculados exclusivamente a partir das medições registradas." /><SectionCard title="Desempenho por etapa" description="Etapas ordenadas pelo maior tempo médio"><div className="divide-y">{stageRows.map((row, index) => <div key={`${row.process}-${row.stage}`} className="grid gap-2 px-5 py-4 sm:grid-cols-[40px_1.3fr_1fr_repeat(3,90px)] sm:items-center"><span className="text-sm font-semibold text-muted-foreground">{String(index+1).padStart(2,"0")}</span><div><p className="font-medium">{row.stage}</p><p className="text-xs text-muted-foreground">{row.process}</p></div><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${Math.min(100,row.avg/55*100)}%`}} /></div><Metric label="Média" value={row.avg} /><Metric label="Menor" value={row.min} /><Metric label="Maior" value={row.max} /></div>)}</div></SectionCard></div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div><p className="text-[11px] uppercase tracking-[.05em] text-muted-foreground">{label}</p><p className="font-mono text-sm font-semibold">{Math.round(value)} min</p></div>; }

function TeamPage({ employees, isAdmin, onAdd }: { employees: EmployeeDraft[]; isAdmin: boolean; onAdd: () => void }) {
  const adminEmployees: EmployeeDraft[] = [
    { nome: "Adryan", cargo: "Product Owner / Front-end", email: "", senha: "" },
    { nome: "Cleberson", cargo: "UX/UI", email: "", senha: "" },
    { nome: "Eyshila", cargo: "Analista de Requisitos", email: "", senha: "" },
    { nome: "Gustavo", cargo: "Back-end", email: "", senha: "" },
    { nome: "Nicollas Matheus", cargo: "QA / Testes", email: "", senha: "" },
    { nome: "Pedro Araujo", cargo: "DevOps", email: "", senha: "" },
    { nome: "Rayssa Couto", cargo: "Dados / DBA", email: "", senha: "" },
    { nome: "Yuri", cargo: "Documentação", email: "", senha: "" },
  ];
  const displayedEmployees = isAdmin ? adminEmployees : employees;
  return (
    <div>
      <PageHeading
        eyebrow="Equipe"
        title="Equipe da empresa"
        description="Funcionários cadastrados durante o registro da empresa."
        action={<Button onClick={onAdd}><Plus /> Adicionar funcionário</Button>}
      />
      {!displayedEmployees.length ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="w-full max-w-2xl rounded-3xl border border-dashed border-[#dfe8e5] bg-[#f7faf9] p-10 text-center shadow-sm">
            <h3 className="text-2xl font-semibold tracking-[-.04em] text-[#173b35]">Nenhum funcionário cadastrado</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Cadastre os trabalhadores no registro da empresa para que eles apareçam aqui.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {displayedEmployees.map((employee) => {
            const initials = employee.nome.split(" ").map((name) => name[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={`${employee.email}-${employee.nome}`} className="flex items-center gap-4 rounded-2xl border bg-white p-4">
                <Avatar><AvatarFallback className="bg-[#e5f1ee] font-semibold text-primary">{initials}</AvatarFallback></Avatar>
                <div className="min-w-0"><p className="truncate font-semibold">{employee.nome}</p><p className="truncate text-sm text-muted-foreground">{employee.cargo}</p></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsPage({ notifications }: { notifications: boolean }) {
  const [notify, setNotify] = useState(notifications);
  const [weekly, setWeekly] = useState(true);
  return <div><PageHeading title="Configurações" description="Preferências locais desta visualização do LeanOS." /><SectionCard title="Notificações" description="Escolha os avisos que deseja acompanhar"><div className="divide-y"><SettingRow title="Alertas operacionais" description="Processos atrasados, prazos próximos e indicadores fora da meta" checked={notify} onChecked={setNotify} /><SettingRow title="Resumo semanal" description="Síntese das medições e melhorias verificadas na semana" checked={weekly} onChecked={setWeekly} /></div></SectionCard></div>;
}

function SettingRow({ title, description, checked, onChecked }: { title: string; description: string; checked: boolean; onChecked: (checked: boolean) => void }) { return <div className="flex items-center justify-between gap-6 px-5 py-4"><div><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onChecked} aria-label={title} /></div>; }

function RoadmapPage({ icon: Icon, title, text }: { icon: typeof FileBarChart; title: string; text: string }) { return <div className="flex min-h-[60vh] items-center justify-center"><div className="max-w-xl rounded-2xl border bg-white p-8 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-secondary text-primary"><Icon /></span><h2 className="mt-5 text-xl font-semibold">{title}</h2><p className="mt-2 leading-7 text-muted-foreground">{text}</p><StatusBadge status="Planejado" /></div></div>; }

function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="flex min-h-[65vh] items-center justify-center"><div className="max-w-md rounded-2xl border bg-white p-8 text-center"><RefreshCw className="mx-auto size-8 text-[#b54239]" /><h2 className="mt-4 text-xl font-semibold">Não foi possível carregar os dados locais</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Os registros salvos neste dispositivo parecem estar corrompidos. Os dados foram preservados. Tente novamente ou saia da conta para acessar outra empresa.</p><Button className="mt-5" onClick={onRetry}><RefreshCw /> Tentar novamente</Button></div></div>; }

function SearchDialog({ open, onOpenChange, query, onQuery, processes, tasks, improvements, onNavigate }: { open: boolean; onOpenChange: (open: boolean) => void; query: string; onQuery: (query: string) => void; processes: LeanProcess[]; tasks: TaskItem[]; improvements: Improvement[]; onNavigate: (page: string) => void }) {
  const results = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return []; return [
    ...processes.filter((item) => `${item.name} ${item.id} ${item.owner}`.toLowerCase().includes(q)).map((item) => ({ type: "Processo", title: item.name, detail: `${item.id} · ${item.owner}`, page: "Processos", icon: Workflow })),
    ...tasks.filter((item) => `${item.title} ${item.id} ${item.owner}`.toLowerCase().includes(q)).map((item) => ({ type: "Tarefa", title: item.title, detail: `${item.id} · ${item.owner}`, page: "Tarefas", icon: ListChecks })),
    ...improvements.filter((item) => `${item.title} ${item.id} ${item.owner}`.toLowerCase().includes(q)).map((item) => ({ type: "Melhoria", title: item.title, detail: `${item.id} · ${item.owner}`, page: "Melhorias", icon: Sparkles })),
  ].slice(0, 8); }, [query, processes, tasks, improvements]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl"><DialogHeader className="sr-only"><DialogTitle>Busca global</DialogTitle><DialogDescription>Encontre processos, tarefas e melhorias.</DialogDescription></DialogHeader><div className="flex items-center gap-3 border-b px-4"><Search className="size-5 text-muted-foreground" /><Input autoFocus value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar processo, tarefa ou melhoria…" className="h-14 border-0 px-0 text-base shadow-none focus-visible:ring-0" /></div><div className="max-h-[420px] overflow-y-auto p-2">{!query ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">Digite para buscar em todo o LeanOS.</div> : !results.length ? <EmptySearchState /> : results.map(({ type, title, detail, page, icon: Icon }, index) => <button key={`${type}-${index}`} onClick={() => onNavigate(page)} className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#f3f7f6]"><span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{title}</strong><span className="block truncate text-xs text-muted-foreground">{type} · {detail}</span></span></button>)}</div></DialogContent></Dialog>;
}

