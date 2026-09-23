import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDate, measurementMinutes, processStatus, reductionPercent, taskStatus, uniqueStageNames } from "../lib/leanos-domain.ts";
import { companyKey, commitWorkspace, exportWorkspace, parseWorkspaceBackup, readWorkspace, validateWorkspaceRelations, WorkspaceConflictError, writeWorkspace } from "../lib/leanos-storage.ts";

class Storage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
}
function fixture() {
  return {
    profile: { nome: "Empresa", cnpj: "12345678000190", email: "empresa@example.test", telefone: "45999999999", senha: "credencial-empresa" },
    employees: [{ nome: "Ana", email: "ana@example.test", cargo: "Analista", senha: "credencial-funcionario" }],
    processes: [{ id: "P1", name: "Pedidos", status: "Planejado", owner: "Ana", priority: "Média", category: "Operacional", progress: 0, start: "2026-09-01", due: "2026-09-30", updated: "Agora", stages: [{ id: "E1", name: "Triagem", order: 1, measurements: [20] }] }],
    tasks: [{ id: "T1", title: "Revisar", processId: "P1", owner: "Ana", priority: "Alta", status: "Pendente", due: "2026-09-20", progress: 0 }],
    improvements: [{ id: "I1", title: "Padronizar", processId: "P1", stage: "Triagem", stageId: "E1", problem: "Espera", action: "Checklist", owner: "Ana", priority: "Alta", status: "Proposta", before: 20, after: null, date: "2026-09-01" }],
  };
}

test("calendar validation handles leap years, legacy dates and impossible days", () => {
  assert.equal(calendarDate("29/02/2024"), "2024-02-29");
  assert.equal(calendarDate("2026-02-29"), null);
  assert.equal(calendarDate("2026-13-01"), null);
  assert.equal(calendarDate("2026-04-31"), null);
});

test("measurements preserve sub-minute precision and support crossing midnight", () => {
  assert.equal(measurementMinutes("2026-09-01T23:50", "2026-09-02T00:10"), 20);
  assert.equal(measurementMinutes("2026-09-01T09:00:00", "2026-09-01T09:00:30"), 0.5);
  for (const end of ["2026-09-01T08:59", "2026-09-01T09:00", "2026-09-01T25:00", "invalid"]) assert.throws(() => measurementMinutes("2026-09-01T09:00", end));
});

test("overdue status is derived without changing saved status or completed items", () => {
  const data = fixture();
  assert.equal(taskStatus(data.tasks[0], "2026-09-22"), "Atrasada");
  assert.equal(data.tasks[0].status, "Pendente");
  assert.equal(taskStatus({ ...data.tasks[0], status: "Concluída" }, "2026-09-22"), "Concluída");
  assert.equal(processStatus(data.processes[0], "2026-09-30"), "Planejado");
  assert.equal(processStatus(data.processes[0], "2026-10-01"), "Atrasado");
});

test("stage names and percentages handle duplicates and missing baselines", () => {
  assert.throws(() => uniqueStageNames("Triagem\n triagem "));
  assert.deepEqual(uniqueStageNames(" Triagem\n\nConferência "), ["Triagem", "Conferência"]);
  assert.equal(reductionPercent(0, 10), null);
  assert.equal(reductionPercent(20, null), null);
  assert.equal(reductionPercent(20, 30), -50);
});

test("stale company writes are rejected and preserve the latest saved data", () => {
  const storage = new Storage(); const first = fixture(); writeWorkspace(storage, first);
  const tabA = readWorkspace(storage, "Empresa"); const tabB = readWorkspace(storage, "Empresa");
  commitWorkspace(storage, tabA, { tasks: [{ ...tabA.tasks[0], status: "Concluída", progress: 100 }] });
  assert.throws(() => commitWorkspace(storage, tabB, { improvements: [] }), WorkspaceConflictError);
  assert.equal(readWorkspace(storage, "Empresa").tasks[0].status, "Concluída");
  assert.equal(readWorkspace(storage, "Empresa").improvements.length, 1);
});

test("invalid relationships and duplicate IDs cannot be saved", () => {
  const original = fixture();
  for (const change of [
    { tasks: [{ ...original.tasks[0], processId: "missing" }] },
    { tasks: [{ ...original.tasks[0], owner: "Unknown" }] },
    { tasks: [original.tasks[0], original.tasks[0]] },
    { improvements: [{ ...original.improvements[0], stageId: "missing" }] },
    { improvements: [{ ...original.improvements[0], status: "Implementada" }] },
    { processes: [{ ...original.processes[0], due: "2026-08-31" }] },
  ]) assert.throws(() => validateWorkspaceRelations({ ...original, ...change }));
});

test("backups round-trip operational data without any credentials", () => {
  const workspace = fixture(); const backup = exportWorkspace(workspace);
  assert.ok(!backup.includes("credencial"));
  assert.ok(!backup.includes('"senha"'));
  const restored = parseWorkspaceBackup(backup, workspace);
  assert.deepEqual(restored, { processes: workspace.processes, tasks: workspace.tasks, improvements: workspace.improvements });
  assert.throws(() => parseWorkspaceBackup(backup, { ...workspace, profile: { ...workspace.profile, nome: "Outra empresa" } }));
  assert.throws(() => parseWorkspaceBackup('{"format":"leanos-backup","version":99}', workspace));
});

test("future schemas and workspace identity mismatches are rejected", () => {
  const storage = new Storage();
  storage.setItem(companyKey("Empresa"), JSON.stringify({ ...fixture(), schemaVersion: 2 }));
  assert.throws(() => readWorkspace(storage, "Empresa"));
  storage.setItem(companyKey("Outra"), JSON.stringify(fixture()));
  assert.throws(() => readWorkspace(storage, "Outra"));
});
