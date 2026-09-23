import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readWorkspace, writeWorkspace } from "../lib/leanos-storage.ts";

test("old callbacks cannot write after logout and consecutive updates use the latest snapshot", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  for (const name of ["window", "document", "navigator"]) Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act, createElement } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { useWorkspace } = await import("../hooks/use-workspace.ts");
  let controller;
  function Harness() { controller = useWorkspace(); return null; }
  const root = createRoot(document.getElementById("root"));
  const makeCompany = (nome) => ({ profile: { nome, cnpj: "", email: "a@example.test", telefone: "", senha: "hash" }, employees: [{ nome: "Ana", cargo: "Analista", email: "a@example.test", senha: "hash" }], processes: [], tasks: [], improvements: [] });
  writeWorkspace(window.localStorage, makeCompany("A")); writeWorkspace(window.localStorage, makeCompany("B"));
  try {
    await act(async () => root.render(createElement(Harness)));
    await act(async () => controller.enterSession({ role: "company", companyName: "A" }));
    const oldCommit = controller.commitChanges;
    await act(async () => { controller.logout(); controller.enterSession({ role: "company", companyName: "B" }); });
    assert.equal(oldCommit({ employees: [] }), false);
    assert.equal(readWorkspace(window.localStorage, "A").employees.length, 1);
    assert.equal(readWorkspace(window.localStorage, "B").employees.length, 1);
    await act(async () => {
      assert.equal(controller.commitChanges((current) => ({ employees: [...current.employees, { nome: "Bia", cargo: "Analista", email: "b@example.test", senha: "hash" }] })), true);
      assert.equal(controller.commitChanges((current) => ({ employees: [...current.employees, { nome: "Cris", cargo: "Analista", email: "c@example.test", senha: "hash" }] })), true);
    });
    assert.equal(readWorkspace(window.localStorage, "B").employees.length, 3);
  } finally { await act(async () => root.unmount()); dom.window.close(); }
});
