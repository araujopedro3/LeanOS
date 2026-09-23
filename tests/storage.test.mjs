import { test } from "node:test";
import assert from "node:assert/strict";
import { companyKey, readWorkspace, writeWorkspace, newId, validateEmployees, readSession, SESSION_STORAGE_KEY } from "../lib/leanos-storage.ts";
import { hashPassword, verifyPassword } from "../lib/leanos-password.ts";
class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
  removeItem(key) { this.data.delete(key); }
}
const company = (name) => ({ profile: { nome: name, cnpj: "12345678000190", email: "empresa@example.test", telefone: "45999999999", senha: "teste" }, employees: [{ nome: "Operador", cargo: "Analista", email: "operador@example.test", senha: "teste" }], processes: [], tasks: [], improvements: [] });

test("companies with similar names remain isolated across writes and ADM sessions", () => {
  const storage = new MemoryStorage();
  const first = company("A&B"); const second = company("A B");
  writeWorkspace(storage, first); writeWorkspace(storage, second);
  assert.notEqual(companyKey(first.profile.nome), companyKey(second.profile.nome));
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ role: "admin", companyName: "ADM" }));
  assert.equal(readSession(storage).role, "admin");
  assert.deepEqual(readWorkspace(storage, "A&B"), first);
  assert.deepEqual(readWorkspace(storage, "a b"), second);
});
test("legacy data is read without requiring a version or deleting records", () => {
  const storage = new MemoryStorage(); const data = company("Legado");
  storage.setItem("leanos-company-profile-company-legado", JSON.stringify(data.profile));
  storage.setItem("leanos-company-employees-company-legado", JSON.stringify(data.employees));
  assert.deepEqual(readWorkspace(storage, "Legado"), data);
  writeWorkspace(storage, data);
  assert.ok(storage.getItem("leanos-company-profile-company-legado"));
});
test("invalid data is rejected without replacing the previous saved workspace", () => {
  const storage = new MemoryStorage(); const data = company("Teste"); writeWorkspace(storage, data);
  assert.throws(() => writeWorkspace(storage, { ...data, processes: [{}] }));
  assert.deepEqual(readWorkspace(storage, "Teste"), data);
  storage.setItem(companyKey("Corrompida"), "{broken");
  assert.throws(() => readWorkspace(storage, "Corrompida"));
  assert.equal(storage.getItem(companyKey("Corrompida")), "{broken");
});
test("IDs remain unique with a frozen clock", () => {
  const original = Date.now; Date.now = () => 1800000000123;
  try { assert.equal(new Set(Array.from({ length: 5000 }, () => newId("PRC"))).size, 5000); }
  finally { Date.now = original; }
});
test("employees cannot reuse names or emails and must have a valid email", () => {
  const employee = company("Teste").employees[0];
  assert.throws(() => validateEmployees([employee, { ...employee, email: "outro@example.test" }]));
  assert.throws(() => validateEmployees([{ ...employee, email: "invalid" }]));
});
test("passwords use distinct salted hashes and preserve spaces when verified", async () => {
  const first = await hashPassword(" teste "); const second = await hashPassword(" teste ");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(" teste ", first), true);
  assert.equal(await verifyPassword("teste", first), false);
  assert.equal(await verifyPassword("legacy", "legacy"), true);
});
