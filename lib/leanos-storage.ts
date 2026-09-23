import { z } from "zod";
import type { LeanProcess, TaskItem, Improvement } from "./leanos-data";
import { calendarDate, DomainError, measurementMinutes } from "./leanos-domain";

export type CompanyProfile = { nome: string; cnpj: string; email: string; telefone: string; senha: string };
export type EmployeeDraft = { nome: string; cargo: string; email: string; senha: string };
export type SessionUser = { role: "admin" | "company"; companyName: string };
export type Workspace = { profile: CompanyProfile; employees: EmployeeDraft[]; processes: LeanProcess[]; tasks: TaskItem[]; improvements: Improvement[] };
export type WorkspaceChanges = Partial<Pick<Workspace, "employees" | "processes" | "tasks" | "improvements">>;
export const SESSION_STORAGE_KEY = "leanos-company-session";
const priority = z.enum(["Baixa", "Média", "Alta", "Crítica"]);
const number = z.number().finite().nonnegative();
const profileSchema = z.object({ nome: z.string().min(1), cnpj: z.string(), email: z.string(), telefone: z.string(), senha: z.string() });
const employeeSchema = z.object({ nome: z.string().min(1), cargo: z.string(), email: z.string(), senha: z.string() });
const stageSchema = z.object({ id: z.string(), name: z.string(), order: number, measurements: z.array(number), records: z.array(z.object({ id: z.string(), start: z.string(), end: z.string(), minutes: number, operator: z.string() })).optional() });
const processSchema = z.object({ id: z.string(), name: z.string(), status: z.enum(["Planejado", "Em andamento", "Em análise", "Concluído", "Atrasado"]), owner: z.string(), priority, category: z.string(), progress: number.max(100), start: z.string(), due: z.string(), updated: z.string(), stages: z.array(stageSchema) });
const taskSchema = z.object({ id: z.string(), title: z.string(), processId: z.string(), owner: z.string(), priority, status: z.enum(["Pendente", "Em andamento", "Concluída", "Atrasada"]), due: z.string(), progress: number.max(100) });
const improvementSchema = z.object({ id: z.string(), title: z.string(), processId: z.string(), stage: z.string(), stageId: z.string().optional(), baselineSamples: number.optional(), problem: z.string(), action: z.string(), owner: z.string(), priority, status: z.enum(["Proposta", "Em execução", "Verificando", "Implementada"]), before: number, after: number.nullable(), date: z.string() });
const workspaceSchema = z.object({ profile: profileSchema, employees: z.array(employeeSchema), processes: z.array(processSchema), tasks: z.array(taskSchema), improvements: z.array(improvementSchema) });

export function companyKey(name: string) { return `leanos-workspace-v1-${encodeURIComponent(name.trim().normalize("NFC").toLowerCase())}`; }
function legacyKey(base: string, name: string) { return `${base}-company-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "empresa"}`; }
export function readWorkspace(storage: Storage, name: string): Workspace | null {
  const saved = storage.getItem(companyKey(name));
  if (saved) {
    const raw = JSON.parse(saved);
    if (raw.schemaVersion !== undefined && raw.schemaVersion !== 1) throw new DomainError("Esta versão dos dados requer uma versão mais recente do LeanOS.");
    const workspace = workspaceSchema.parse(raw);
    if (companyKey(workspace.profile.nome) !== companyKey(name)) throw new DomainError("Os dados não pertencem à empresa selecionada.");
    return workspace;
  }
  const oldProfile = storage.getItem(legacyKey("leanos-company-profile", name));
  if (!oldProfile) return null;
  const profile = profileSchema.parse(JSON.parse(oldProfile));
  if (profile.nome.trim().toLowerCase() !== name.trim().toLowerCase()) return null;
  const read = (key: string) => JSON.parse(storage.getItem(legacyKey(key, name)) ?? "[]");
  return workspaceSchema.parse({ profile, employees: read("leanos-company-employees"), processes: read("leanos-processes"), tasks: read("leanos-tasks"), improvements: read("leanos-improvements") });
}
export function writeWorkspace(storage: Storage, workspace: Workspace) {
  const validated = workspaceSchema.parse(workspace);
  storage.setItem(companyKey(validated.profile.nome), JSON.stringify({ ...validated, schemaVersion: 1 }));
}

export class WorkspaceConflictError extends Error {
  constructor() { super("Os dados foram alterados em outra aba. Recarregue os dados antes de salvar novamente."); }
}

/** Reject stale snapshots instead of silently overwriting another tab's work. */
export function commitWorkspace(storage: Storage, expected: Workspace, changes: WorkspaceChanges): Workspace {
  const current = readWorkspace(storage, expected.profile.nome);
  if (!current || JSON.stringify(current) !== JSON.stringify(expected)) throw new WorkspaceConflictError();
  const next = workspaceSchema.parse({ ...current, ...changes });
  validateWorkspaceRelations(next);
  writeWorkspace(storage, next);
  return next;
}

export function validateWorkspaceRelations(workspace: Workspace) {
  const unique = (ids: string[], label: string) => {
    if (ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length) throw new DomainError(`Identificadores inválidos ou repetidos em ${label}.`);
  };
  unique(workspace.processes.map((item) => item.id), "processos");
  unique(workspace.tasks.map((item) => item.id), "tarefas");
  unique(workspace.improvements.map((item) => item.id), "melhorias");
  const processes = new Map(workspace.processes.map((process) => [process.id, process]));
  const owners = new Set(workspace.employees.map((employee) => employee.nome.trim()));
  for (const process of workspace.processes) {
    if (!process.name.trim() || !process.stages.length || !owners.has(process.owner)) throw new DomainError("Cada processo precisa de nome, etapas e um responsável da empresa.");
    unique(process.stages.map((stage) => stage.id), `etapas de ${process.name}`);
    const start = calendarDate(process.start); const due = calendarDate(process.due);
    if (!start || !due || due < start) throw new DomainError("O prazo do processo deve ser igual ou posterior à data inicial.");
    for (const stage of process.stages) {
      if (!stage.name.trim() || stage.measurements.some((value) => value <= 0)) throw new DomainError("Informe nomes de etapas e durações maiores que zero.");
      const records = stage.records ?? [];
      unique(records.map((record) => record.id), "medições");
      if (records.length > stage.measurements.length) throw new DomainError("O histórico não corresponde às medições da etapa.");
      for (const [index, record] of records.entries()) {
        const saved = stage.measurements[stage.measurements.length - records.length + index];
        if (measurementMinutes(record.start, record.end) !== record.minutes || record.minutes !== saved) throw new DomainError("A duração da medição não corresponde aos horários informados.");
      }
    }
  }
  for (const task of workspace.tasks) {
    if (!processes.has(task.processId) || !owners.has(task.owner) || !task.title.trim() || !calendarDate(task.due)) throw new DomainError("A tarefa precisa de título, prazo, processo e responsável válidos.");
    if (task.status === "Concluída" && task.progress !== 100) throw new DomainError("Uma tarefa concluída deve ter progresso de 100%.");
  }
  for (const improvement of workspace.improvements) {
    const process = processes.get(improvement.processId);
    const stage = process?.stages.find((stage) => improvement.stageId ? stage.id === improvement.stageId : stage.name === improvement.stage);
    if (!stage) throw new DomainError("A melhoria precisa estar vinculada a uma etapa existente.");
    if (improvement.status === "Implementada" && (improvement.after === null || improvement.after <= 0)) throw new DomainError("Informe o tempo posterior para implementar a melhoria.");
  }
}

/** A data backup deliberately excludes passwords and account credentials. */
export function exportWorkspace(workspace: Workspace) {
  return JSON.stringify({ format: "leanos-backup", version: 1, company: workspace.profile.nome, exportedAt: new Date().toISOString(), processes: workspace.processes, tasks: workspace.tasks, improvements: workspace.improvements }, null, 2);
}

export function parseWorkspaceBackup(text: string, workspace: Workspace): WorkspaceChanges {
  const backup = z.object({ format: z.literal("leanos-backup"), version: z.literal(1), company: z.string(), processes: z.array(processSchema), tasks: z.array(taskSchema), improvements: z.array(improvementSchema) }).parse(JSON.parse(text));
  if (companyKey(backup.company) !== companyKey(workspace.profile.nome)) throw new DomainError("Este backup pertence a outra empresa.");
  const changes = { processes: backup.processes, tasks: backup.tasks, improvements: backup.improvements };
  validateWorkspaceRelations({ ...workspace, ...changes });
  return changes;
}
export function readSession(storage: Storage): SessionUser | null {
  const saved = storage.getItem(SESSION_STORAGE_KEY);
  if (!saved) return null;
  const result = z.object({ role: z.enum(["admin", "company"]), companyName: z.string().min(1) }).safeParse(JSON.parse(saved));
  return result.success ? result.data : null;
}
export function newId(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function displayDate(value: string) { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); return match ? `${match[3]}/${match[2]}/${match[1]}` : value; }
export function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
export function validateEmployees(employees: EmployeeDraft[]) {
  if (!employees.length) throw new Error("Cadastre pelo menos um funcionário.");
  const emails = new Set<string>();
  const names = new Set<string>();
  for (const employee of employees) {
    if (!employee.nome.trim() || !employee.cargo.trim() || !employee.senha.trim() || !validEmail(employee.email)) throw new Error("Informe nome, função, e-mail válido e senha de cada funcionário.");
    const email = employee.email.trim().toLowerCase();
    const name = employee.nome.trim().toLowerCase();
    if (emails.has(email) || names.has(name)) throw new Error("Já existe um funcionário com esse nome ou e-mail nesta empresa.");
    emails.add(email); names.add(name);
  }
}
