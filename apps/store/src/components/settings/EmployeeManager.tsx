"use client";

import { useState } from "react";
import {
  getStoreEmployees,
  createEmployee,
  updateEmployee,
} from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";

type EmployeeRole = "STORE_OWNER" | "STORE_MANAGER" | "STORE_CASHIER" | "STORE_INVENTORY_CLERK";

interface EmployeeManagerProps {
  initialEmployees: Awaited<ReturnType<typeof getStoreEmployees>>;
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
  STORE_OWNER: "მფლობელი",
  STORE_MANAGER: "მენეჯერი",
  STORE_CASHIER: "კასირი",
  STORE_INVENTORY_CLERK: "მარაგის თანამშრომელი",
};

export function EmployeeManager({ initialEmployees }: EmployeeManagerProps) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    role: "STORE_CASHIER" as EmployeeRole,
    pin: "",
  });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      role: "STORE_CASHIER",
      pin: "",
    });
    setShowForm(false);
    setEditing(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setLoading(true);
    const result = await createEmployee({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      role: form.role,
      pin: form.pin || undefined,
    });
    setLoading(false);
    if (result.success) {
      const updated = await getStoreEmployees();
      setEmployees(updated);
      resetForm();
    }
  };

  const handleUpdate = async (
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      role: EmployeeRole;
      pin: string;
      isActive: boolean;
    }>
  ) => {
    setLoading(true);
    const result = await updateEmployee(id, data);
    setLoading(false);
    if (result.success) {
      const updated = await getStoreEmployees();
      setEmployees(updated);
      setEditing(null);
    }
  };

  const handleDeactivate = async (id: string, isActive: boolean) => {
    if (!confirm(isActive ? "ნამდვილად გსურთ თანამშრომლის დექტივაცია?" : "ნამდვილად გსურთ თანამშრომლის გააქტიურება?")) return;
    setLoading(true);
    await handleUpdate(id, { isActive: !isActive });
    setLoading(false);
  };

  const generatePin = () => {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    setForm((f) => ({ ...f, pin }));
  };

  const startEdit = (e: (typeof employees)[0]) => {
    setEditing(e.id);
    setForm({
      firstName: e.firstName,
      lastName: e.lastName,
      phone: e.phone ?? "",
      email: e.email ?? "",
      role: e.role as EmployeeRole,
      pin: e.pin ?? "",
    });
    setShowForm(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !form.firstName.trim() || !form.lastName.trim()) return;
    await handleUpdate(editing, {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      role: form.role,
      pin: form.pin || undefined,
    });
    resetForm();
  };

  return (
    <div className="space-y-6">
      {!showForm ? (
        <Button size="sm" onClick={() => setShowForm(true)}>
          ახალი თანამშრომელი
        </Button>
      ) : (
        <form
          onSubmit={editing ? handleEditSubmit : handleCreate}
          className="p-6 rounded-xl border border-border bg-bg-tertiary space-y-4 max-w-xl"
        >
          <h3 className="font-medium">{editing ? "რედაქტირება" : "ახალი თანამშრომელი"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">სახელი *</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">გვარი *</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">ტელეფონი</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">როლი</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as EmployeeRole }))}
                className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
              >
                {(Object.keys(ROLE_LABELS) as EmployeeRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">PIN (POS-ისთვის, 4-6 ციფრი)</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
                  placeholder="4-6 ციფრი"
                  className="flex-1 rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
                />
                <button
                  type="button"
                  onClick={generatePin}
                  className="rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-muted hover:text-text"
                >
                  შემთხვევითი
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {editing ? "შენახვა" : "დამატება"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>
              გაუქმება
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">სახელი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">ტელეფონი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">როლი</th>
              <th className="text-left text-xs font-medium text-text-muted uppercase px-4 py-3">სტატუსი</th>
              <th className="w-40" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((emp: { id: string; firstName: string; lastName: string; phone: string | null; role: string; isActive?: boolean }) => (
              <tr key={emp.id}>
                <td className="px-4 py-3 font-medium">{emp.firstName} {emp.lastName}</td>
                <td className="px-4 py-3">{emp.phone ?? "—"}</td>
                <td className="px-4 py-3">{ROLE_LABELS[emp.role as EmployeeRole] ?? emp.role}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm ${emp.isActive !== false ? "text-green-500" : "text-text-muted"}`}>
                    {emp.isActive !== false ? "აქტიური" : "დექტივირებული"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => startEdit(emp)}
                    className="text-sm text-copper-light mr-2"
                  >
                    რედაქტირება
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeactivate(emp.id, emp.isActive !== false)}
                    className={`text-sm ${emp.isActive !== false ? "text-amber-500" : "text-green-500"}`}
                  >
                    {emp.isActive !== false ? "დექტივაცია" : "გააქტიურება"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
