export type Period = "today" | "7d" | "30d" | "90d" | "12m" | "custom";
export type Status = "Planejado" | "Em andamento" | "Em análise" | "Concluído" | "Atrasado";
export type Priority = "Baixa" | "Média" | "Alta" | "Crítica";

export type Stage = {
  id: string;
  name: string;
  order: number;
  measurements: number[];
};

export type LeanProcess = {
  id: string;
  name: string;
  status: Status;
  owner: string;
  priority: Priority;
  category: string;
  progress: number;
  start: string;
  due: string;
  updated: string;
  stages: Stage[];
};

export type TaskItem = {
  id: string;
  title: string;
  processId: string;
  owner: string;
  priority: Priority;
  status: "Pendente" | "Em andamento" | "Concluída" | "Atrasada";
  due: string;
  progress: number;
};

export type Improvement = {
  id: string;
  title: string;
  processId: string;
  stage: string;
  problem: string;
  action: string;
  owner: string;
  priority: Priority;
  status: "Proposta" | "Em execução" | "Verificando" | "Implementada";
  before: number;
  after: number | null;
  date: string;
};

export const initialProcesses: LeanProcess[] = [
  {
    id: "PRC-001",
    name: "Atendimento ao cliente",
    status: "Em andamento",
    owner: "Pedro",
    priority: "Alta",
    category: "Atendimento",
    progress: 68,
    start: "02/09/2026",
    due: "25/09/2026",
    updated: "Hoje, 10:42",
    stages: [
      { id: "ETP-001", name: "Triagem", order: 1, measurements: [12, 15, 10, 14, 11] },
      { id: "ETP-002", name: "Análise da solicitação", order: 2, measurements: [31, 34, 29, 38, 32] },
      { id: "ETP-003", name: "Resolução", order: 3, measurements: [20, 24, 18, 21, 19] },
      { id: "ETP-004", name: "Retorno ao cliente", order: 4, measurements: [8, 9, 7, 10, 8] },
    ],
  },
  {
    id: "PRC-002",
    name: "Separação de pedidos",
    status: "Atrasado",
    owner: "Gustavo",
    priority: "Crítica",
    category: "Logística",
    progress: 44,
    start: "27/08/2026",
    due: "12/09/2026",
    updated: "Hoje, 09:18",
    stages: [
      { id: "ETP-005", name: "Receber pedido", order: 1, measurements: [6, 7, 5, 8] },
      { id: "ETP-006", name: "Localizar itens", order: 2, measurements: [26, 29, 33, 28] },
      { id: "ETP-007", name: "Separar e conferir", order: 3, measurements: [39, 44, 41, 37] },
      { id: "ETP-008", name: "Liberar expedição", order: 4, measurements: [12, 16, 13, 15] },
    ],
  },
  {
    id: "PRC-003",
    name: "Aprovação de compras",
    status: "Em análise",
    owner: "Rayssa",
    priority: "Média",
    category: "Administrativo",
    progress: 76,
    start: "01/09/2026",
    due: "28/09/2026",
    updated: "Ontem, 16:05",
    stages: [
      { id: "ETP-009", name: "Solicitação", order: 1, measurements: [14, 16, 13, 17] },
      { id: "ETP-010", name: "Cotação", order: 2, measurements: [45, 51, 48, 42] },
      { id: "ETP-011", name: "Aprovação", order: 3, measurements: [27, 31, 29, 34] },
    ],
  },
  {
    id: "PRC-004",
    name: "Expedição de mercadorias",
    status: "Concluído",
    owner: "Nicollas",
    priority: "Baixa",
    category: "Logística",
    progress: 100,
    start: "18/08/2026",
    due: "10/09/2026",
    updated: "10 set, 17:22",
    stages: [
      { id: "ETP-012", name: "Conferência", order: 1, measurements: [18, 17, 16, 15] },
      { id: "ETP-013", name: "Embalagem", order: 2, measurements: [24, 22, 21, 19] },
      { id: "ETP-014", name: "Carregamento", order: 3, measurements: [20, 18, 19, 17] },
    ],
  },
  {
    id: "PRC-005",
    name: "Integração de novos clientes",
    status: "Planejado",
    owner: "Eyshila",
    priority: "Média",
    category: "Atendimento",
    progress: 12,
    start: "22/09/2026",
    due: "20/10/2026",
    updated: "12 set, 14:10",
    stages: [
      { id: "ETP-015", name: "Coleta de dados", order: 1, measurements: [] },
      { id: "ETP-016", name: "Configuração", order: 2, measurements: [] },
      { id: "ETP-017", name: "Validação", order: 3, measurements: [] },
    ],
  },
];

export const initialTasks: TaskItem[] = [
  { id: "TSK-021", title: "Validar nova sequência de conferência", processId: "PRC-002", owner: "Gustavo", priority: "Crítica", status: "Atrasada", due: "12/09/2026", progress: 40 },
  { id: "TSK-022", title: "Mapear causas de espera na cotação", processId: "PRC-003", owner: "Rayssa", priority: "Alta", status: "Em andamento", due: "17/09/2026", progress: 65 },
  { id: "TSK-023", title: "Revisar roteiro de triagem", processId: "PRC-001", owner: "Cleberson", priority: "Média", status: "Pendente", due: "19/09/2026", progress: 0 },
  { id: "TSK-024", title: "Comparar tempos após padronização", processId: "PRC-004", owner: "Nicollas", priority: "Baixa", status: "Concluída", due: "10/09/2026", progress: 100 },
];

export const initialImprovements: Improvement[] = [
  {
    id: "MEL-008",
    title: "Conferência por zona de armazenagem",
    processId: "PRC-002",
    stage: "Separar e conferir",
    problem: "A conferência concentra 43% do tempo do processo.",
    action: "Agrupar pedidos por zona e usar uma lista única de conferência.",
    owner: "Gustavo",
    priority: "Crítica",
    status: "Em execução",
    before: 41,
    after: null,
    date: "08/09/2026",
  },
  {
    id: "MEL-007",
    title: "Checklist de triagem rápida",
    processId: "PRC-001",
    stage: "Análise da solicitação",
    problem: "Solicitações chegam sem as informações mínimas.",
    action: "Aplicar checklist antes do encaminhamento para análise.",
    owner: "Cleberson",
    priority: "Alta",
    status: "Verificando",
    before: 38,
    after: 32,
    date: "04/09/2026",
  },
  {
    id: "MEL-005",
    title: "Padrão visual de embalagem",
    processId: "PRC-004",
    stage: "Embalagem",
    problem: "Variação elevada entre operadores.",
    action: "Padronizar a disposição dos materiais e a sequência de embalagem.",
    owner: "Nicollas",
    priority: "Média",
    status: "Implementada",
    before: 24,
    after: 19,
    date: "27/08/2026",
  },
];

export const trendByPeriod: Record<Period, { label: string; avg: number; target: number; improvements: number }[]> = {
  today: [
    { label: "08h", avg: 94, target: 90, improvements: 0 },
    { label: "10h", avg: 89, target: 90, improvements: 1 },
    { label: "12h", avg: 84, target: 90, improvements: 1 },
    { label: "14h", avg: 81, target: 90, improvements: 2 },
  ],
  "7d": [
    { label: "09/09", avg: 103, target: 90, improvements: 0 },
    { label: "10/09", avg: 99, target: 90, improvements: 1 },
    { label: "11/09", avg: 96, target: 90, improvements: 1 },
    { label: "12/09", avg: 94, target: 90, improvements: 1 },
    { label: "13/09", avg: 91, target: 90, improvements: 2 },
    { label: "14/09", avg: 86, target: 90, improvements: 2 },
    { label: "15/09", avg: 81, target: 90, improvements: 3 },
  ],
  "30d": [
    { label: "18 ago", avg: 118, target: 90, improvements: 0 },
    { label: "23 ago", avg: 113, target: 90, improvements: 1 },
    { label: "28 ago", avg: 106, target: 90, improvements: 1 },
    { label: "02 set", avg: 101, target: 90, improvements: 2 },
    { label: "07 set", avg: 94, target: 90, improvements: 2 },
    { label: "12 set", avg: 86, target: 90, improvements: 3 },
    { label: "15 set", avg: 81, target: 90, improvements: 3 },
  ],
  "90d": [
    { label: "Jun", avg: 136, target: 90, improvements: 0 },
    { label: "Jul", avg: 122, target: 90, improvements: 1 },
    { label: "Ago", avg: 106, target: 90, improvements: 2 },
    { label: "Set", avg: 81, target: 90, improvements: 3 },
  ],
  "12m": [
    { label: "Out", avg: 154, target: 90, improvements: 0 },
    { label: "Dez", avg: 148, target: 90, improvements: 0 },
    { label: "Fev", avg: 137, target: 90, improvements: 1 },
    { label: "Abr", avg: 128, target: 90, improvements: 1 },
    { label: "Jun", avg: 116, target: 90, improvements: 2 },
    { label: "Ago", avg: 99, target: 90, improvements: 2 },
    { label: "Set", avg: 81, target: 90, improvements: 3 },
  ],
  custom: [
    { label: "01 set", avg: 106, target: 90, improvements: 0 },
    { label: "04 set", avg: 101, target: 90, improvements: 1 },
    { label: "07 set", avg: 96, target: 90, improvements: 1 },
    { label: "10 set", avg: 89, target: 90, improvements: 2 },
    { label: "13 set", avg: 84, target: 90, improvements: 2 },
    { label: "15 set", avg: 81, target: 90, improvements: 3 },
  ],
};

export const wasteCauses = [
  { name: "Espera por informação", value: 12 },
  { name: "Retrabalho", value: 8 },
  { name: "Interrupção", value: 6 },
  { name: "Deslocamento", value: 4 },
];

export function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function processAverage(process: LeanProcess) {
  return process.stages.reduce((sum, stage) => sum + avg(stage.measurements), 0);
}

export function getBottleneck(process: LeanProcess) {
  const stageAverages = process.stages.map((stage) => ({ stage, value: avg(stage.measurements) }));
  const total = stageAverages.reduce((sum, item) => sum + item.value, 0);
  const highest = stageAverages.reduce((best, item) => item.value > best.value ? item : best, stageAverages[0] ?? { stage: process.stages[0], value: 0 });
  return { name: highest.stage?.name ?? "Sem dados", minutes: highest.value, share: total ? Math.round((highest.value / total) * 100) : 0 };
}

export function processById(processes: LeanProcess[], id: string) {
  return processes.find((process) => process.id === id);
}
