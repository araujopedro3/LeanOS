import type { LeanProcess, TaskItem } from "./leanos-data";

export class DomainError extends Error {}

/** Dates are calendar dates, not UTC timestamps. Accept the legacy display format. */
export function calendarDate(value: string): string | null {
  const normalized = value.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? normalized : null;
}

export function isOverdue(due: string, today: string) {
  const date = calendarDate(due);
  return date !== null && date < today;
}

export function taskStatus(task: TaskItem, today: string): TaskItem["status"] {
  return task.status !== "Concluída" && isOverdue(task.due, today) ? "Atrasada" : task.status;
}

export function processStatus(process: LeanProcess, today: string): LeanProcess["status"] {
  return process.status !== "Concluído" && isOverdue(process.due, today) ? "Atrasado" : process.status;
}

export function measurementMinutes(start: string, end: string) {
  const pattern = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
  if (!pattern.test(start) || !pattern.test(end) || !calendarDate(start.slice(0, 10)) || !calendarDate(end.slice(0, 10))) {
    throw new DomainError("Informe datas e horários válidos para a medição.");
  }
  const duration = (new Date(end).getTime() - new Date(start).getTime()) / 60_000;
  if (!Number.isFinite(duration) || duration <= 0) throw new DomainError("O horário de término deve ser posterior ao início.");
  return Math.round(duration * 100) / 100;
}

export function reductionPercent(before: number, after: number | null) {
  return before > 0 && after !== null ? Math.round(((before - after) / before) * 100) : null;
}

export function uniqueStageNames(text: string) {
  const names = text.split("\n").map((name) => name.trim()).filter(Boolean);
  if (!names.length) throw new DomainError("Cadastre pelo menos uma etapa.");
  if (new Set(names.map((name) => name.normalize("NFC").toLowerCase())).size !== names.length) {
    throw new DomainError("Use nomes diferentes para as etapas do processo.");
  }
  return names;
}
