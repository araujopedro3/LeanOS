import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readWorkspace, companyKey, writeWorkspace, SESSION_STORAGE_KEY } from "../lib/leanos-storage.ts";

test("company registration, processes, tasks, measurements, improvements and account isolation", async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost", pretendToBeVisual: true });
  for (const name of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "NodeFilter", "HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement", "HTMLFormElement", "HTMLButtonElement", "SVGElement", "MutationObserver", "CustomEvent", "Event", "MouseEvent", "KeyboardEvent", "DocumentFragment", "getComputedStyle"])
    Object.defineProperty(globalThis, name, { configurable: true, value: name === "getComputedStyle" ? dom.window[name].bind(dom.window) : dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.scrollTo = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 1024, bottom: 300, width: 1024, height: 300, toJSON() {} });
  const { createElement, act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { LeanOSApp } = await import("../components/leanos/app-shell.tsx");
  let root = createRoot(document.getElementById("root"));
  const settle = async (ms = 0) => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); }); };
  const waitFor = async (condition) => {
    const deadline = Date.now() + 5000;
    while (!condition() && Date.now() < deadline) await settle(20);
    assert.ok(condition(), "The asynchronous operation did not finish");
  };
  const button = (text) => { const result = [...document.querySelectorAll("button")].find((element) => element.textContent.trim() === text); assert.ok(result, `Button missing: ${text}`); return result; };
  const click = async (element) => { await act(async () => element.click()); await settle(); };
  const press = async (element, key) => {
    assert.ok(element);
    await act(async () => { element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); });
    await settle();
  };
  const logout = async () => {
    const trigger = [...document.querySelectorAll('button[aria-haspopup="menu"]')].find((element) => element.textContent.includes("Empresa") || element.textContent.includes("Gestor ADMIN"));
    await press(trigger, "Enter");
    await click([...document.querySelectorAll('[role="menuitem"]')].find((element) => element.textContent.trim() === "Sair"));
  };
  const fill = async (selector, value) => {
    const element = document.querySelector(selector); assert.ok(element, `Input missing: ${selector}`);
    await act(async () => {
      const proto = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const saved = () => readWorkspace(window.localStorage, "Empresa QA");
  const remount = async () => {
    await act(async () => root.unmount());
    root = createRoot(document.getElementById("root"));
    await act(async () => root.render(createElement(LeanOSApp)));
    await settle(50);
  };
  try {
    await act(async () => root.render(createElement(LeanOSApp)));
    await settle();
    await click([...document.querySelectorAll("button")].find((element) => element.textContent.includes("NovaEmpresa")));
    for (const [id, value] of Object.entries({ "company-name": "Empresa QA", "company-cnpj": "12345678000190", "company-email": "empresa@example.test", "company-phone": "45999999999", "company-password": " teste " })) await fill(`#${id}`, value);
    await fill('input[placeholder="Nome completo"]', "Operador QA");
    await fill('input[placeholder="Ex.: Analista de produção"]', "Analista");
    await fill('input[placeholder="funcionario@empresa.com"]', "operador@example.test");
    await fill('input[placeholder="Senha do funcionário"]', "teste");
    await click(button("Salvar empresa e funcionários"));
    await waitFor(() => document.body.textContent.includes("Painel da empresa"));
    assert.ok(document.body.textContent.includes("Painel da empresa"));
    assert.ok(saved().profile.senha.startsWith("pbkdf2-sha256$"));
    assert.equal(saved().processes.length, 0);

    await click(button("Processos"));
    await click(button("Novo processo"));
    await fill('[aria-label="Nome do processo"]', "Fluxo QA");
    await fill('[aria-label="Etapas em ordem"]', "Triagem\nExecução");
    await click(button("Criar processo"));
    assert.equal(saved().processes.length, 1);
    assert.equal(saved().processes[0].stages.length, 2);
    await fill('[aria-label="Buscar processos"]', "inexistente");
    assert.ok(document.querySelector('[aria-label="Buscar processos"]'), "Search must remain available when no results match");
    await fill('[aria-label="Buscar processos"]', "");

    await click(button("Tarefas"));
    await click(button("Nova tarefa"));
    await fill('[aria-label="Título da tarefa"]', "Tarefa QA");
    await fill('[aria-label="Prazo"]', "2026-12-31");
    await click(button("Adicionar tarefa"));
    assert.equal(saved().tasks.length, 1);
    assert.equal(saved().tasks[0].processId, saved().processes[0].id);
    await click(document.querySelector('[aria-label="Concluir Tarefa QA"]'));
    assert.equal(saved().tasks[0].status, "Concluída");
    assert.equal(saved().tasks[0].progress, 100);
    await press(document.querySelector('[role="combobox"]'), "Enter");
    await click([...document.querySelectorAll('[role="option"]')].find((element) => element.textContent.trim() === "Pendentes"));
    assert.ok(document.querySelector('[role="combobox"]'), "Task filter must remain available with zero results");
    await press(document.querySelector('[role="combobox"]'), "Enter");
    await click([...document.querySelectorAll('[role="option"]')].find((element) => element.textContent.trim() === "Todas"));

    await click(button("Medições"));
    await click(button("Registrar medição"));
    await fill('[aria-label="Término"]', "2026-01-01T00:00");
    await click(button("Confirmar medição"));
    assert.equal(saved().processes[0].stages[0].measurements.length, 0);
    const measurementStart = document.querySelector('[aria-label="Início"]').value;
    await fill('[aria-label="Término"]', measurementStart.slice(0, 11) + "09:20");
    await click(button("Confirmar medição"));
    assert.deepEqual(saved().processes[0].stages[0].measurements, [20]);
    assert.equal(saved().processes[0].stages[0].records[0].operator, "Operador QA");
    assert.ok(!document.body.textContent.includes("Pedro"));

    await click(button("Melhorias"));
    await click(button("Novo plano"));
    await fill('[aria-label="Título"]', "Melhoria QA");
    await fill('[aria-label="Problema identificado"]', "Tempo elevado");
    await fill('[aria-label="Ação proposta"]', "Padronizar triagem");
    await click(button("Registrar plano"));
    assert.equal(saved().improvements.length, 1);
    assert.equal(saved().improvements[0].before, 20);
    await click(button("Atualizar plano"));
    await press(document.querySelector('[aria-label="Situação da melhoria"]'), "Enter");
    await click([...document.querySelectorAll('[role="option"]')].find((element) => element.textContent.trim() === "Implementada"));
    await click(button("Salvar atualização"));
    assert.equal(saved().improvements[0].status, "Proposta", "An implemented improvement requires a measured result");
    await fill('[aria-label="Tempo após a melhoria"]', "10");
    await click(button("Salvar atualização"));
    assert.equal(saved().improvements[0].after, 10);
    assert.equal(saved().improvements[0].status, "Implementada");

    await click(button("Equipe"));
    await click(button("Adicionar funcionário"));
    await fill('[aria-label="Nome do funcionário"]', "Operador QA");
    await fill('[aria-label="Função do trabalhador"]', "Supervisor");
    await fill('[aria-label="E-mail do funcionário"]', "segundo@example.test");
    await fill('[aria-label="Senha do funcionário"]', "teste2");
    await click([...document.querySelectorAll('[role="dialog"] button')].find((element) => element.textContent.trim() === "Adicionar funcionário"));
    assert.equal(saved().employees.length, 1, "Duplicate employee names must be rejected");
    await fill('[aria-label="Nome do funcionário"]', "Supervisor QA");
    await click([...document.querySelectorAll('[role="dialog"] button')].find((element) => element.textContent.trim() === "Adicionar funcionário"));
    await waitFor(() => saved().employees.length === 2);
    assert.ok(saved().employees[0].senha.startsWith("pbkdf2-sha256$"));

    const original = saved();
    await remount();
    assert.deepEqual(saved(), original);
    await click(button("Tarefas"));
    assert.ok(document.body.textContent.includes("Tarefa QA"));

    // Failed writes must not close the form or report a successful mutation.
    await click(button("Nova tarefa"));
    await fill('[aria-label="Título da tarefa"]', "Sem espaço");
    await fill('[aria-label="Prazo"]', "2026-12-31");
    const nativeSet = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function (key, value) { if (key === companyKey("Empresa QA")) throw new Error("QuotaExceededError"); return nativeSet.call(this, key, value); };
    try {
      await click(button("Adicionar tarefa"));
      assert.ok(document.querySelector('[aria-label="Título da tarefa"]'));
      assert.deepEqual(saved(), original);
    } finally { window.Storage.prototype.setItem = nativeSet; }
    await click(button("Cancelar"));

    await logout();
    assert.equal(window.sessionStorage.getItem(SESSION_STORAGE_KEY), null);
    await click([...document.querySelectorAll("button")].find((element) => element.textContent.includes("EmpresaEntrar")));
    await fill("#company-login-name", "Empresa QA");
    await fill("#company-login-password", "incorreta");
    await click(button("Entrar na empresa")); await waitFor(() => document.body.textContent.includes("senha incorreta"));
    assert.ok(document.body.textContent.includes("senha incorreta"));
    await fill("#company-login-password", " teste ");
    await click(button("Entrar na empresa")); await waitFor(() => document.body.textContent.includes("Painel da empresa"));
    assert.ok(document.body.textContent.includes("Painel da empresa"));
    assert.deepEqual(saved(), original);

    // A second company and the ADM demo never erase the first company's data.
    const second = { ...structuredClone(original), profile: { ...original.profile, nome: "Empresa B" }, processes: [], tasks: [], improvements: [] };
    writeWorkspace(window.localStorage, second);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ role: "company", companyName: "Empresa B" }));
    await remount();
    await click(button("Tarefas"));
    assert.ok(!document.body.textContent.includes("Tarefa QA"));
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ role: "admin", companyName: "ADM" }));
    await remount();
    await waitFor(() => document.body.textContent.includes("Atendimento ao cliente"));
    assert.ok(document.body.textContent.includes("Separação de pedidos"));
    assert.deepEqual(saved(), original);
    assert.equal(readWorkspace(window.localStorage, "Empresa B").tasks.length, 0);

    // Corrupt data stays untouched instead of being replaced by demo records.
    window.localStorage.setItem(companyKey("Empresa B"), "{broken");
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ role: "company", companyName: "Empresa B" }));
    await remount();
    assert.ok(document.body.textContent.includes("Não foi possível carregar"));
    assert.equal(window.localStorage.getItem(companyKey("Empresa B")), "{broken");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
