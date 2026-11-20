import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_GROUPS: Array<{ label: string; items: Array<{ to: string; label: string }> }> = [
  {
    label: "Übersicht",
    items: [{ to: "/", label: "Dashboard" }],
  },
  {
    label: "Zeit & Vertrieb",
    items: [
      { to: "/time-tracking", label: "Zeiterfassung" },
      { to: "/clients", label: "Kunden" },
      { to: "/projects", label: "Projekte" },
      { to: "/invoices", label: "Rechnungen" },
      { to: "/reports", label: "Reports" },
    ],
  },
  {
    label: "Personal",
    items: [
      { to: "/employees", label: "Mitarbeiter" },
      { to: "/absences", label: "Abwesenheiten" },
      { to: "/payroll", label: "Lohnabrechnung" },
    ],
  },
  {
    label: "Einkauf",
    items: [
      { to: "/suppliers", label: "Lieferanten" },
      { to: "/articles", label: "Artikel" },
      { to: "/purchase-orders", label: "Bestellungen" },
    ],
  },
  {
    label: "Finanzen",
    items: [
      { to: "/accounting", label: "Buchhaltung" },
      { to: "/bank", label: "Bank" },
    ],
  },
  {
    label: "Konto",
    items: [{ to: "/billing", label: "Paket & Abo" }],
  },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-16 items-center px-5 text-lg font-semibold text-brand-700 dark:text-brand-400">
          TimeTrack Suite
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-2 text-sm">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-slate-500">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Abmelden
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
