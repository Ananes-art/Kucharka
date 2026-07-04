import { NavLink, Outlet } from "react-router-dom";
import { IconHome, IconBook, IconFridge, IconReceipt, IconCart, IconTag } from "./Icons";

const nav = [
  { to: "/", label: "Přehled", icon: IconHome, end: true },
  { to: "/recepty", label: "Recepty", icon: IconBook },
  { to: "/sklad", label: "Sklad", icon: IconFridge },
  { to: "/uctenka", label: "Účtenka", icon: IconReceipt },
  { to: "/nakup", label: "Nákup", icon: IconCart },
  { to: "/suroviny", label: "Suroviny", icon: IconTag },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      {/* boční navigace na desktopu */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-stone-200 bg-white px-3 py-5">
        <div className="flex items-center gap-2 px-3 mb-6">
          <span className="text-2xl">🍳</span>
          <span className="text-lg font-bold text-stone-800">Kuchařka</span>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-stone-600 hover:bg-stone-100"
                }`
              }
            >
              <n.icon />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* horní lišta na mobilu */}
        <header className="md:hidden sticky top-0 z-10 flex items-center gap-2 bg-white border-b border-stone-200 px-4 h-14">
          <span className="text-xl">🍳</span>
          <span className="font-bold text-stone-800">Kuchařka</span>
        </header>

        <main className="flex-1 px-4 md:px-8 py-5 pb-24 md:pb-8 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* spodní navigace na mobilu */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-stone-200 grid grid-cols-6 pb-[env(safe-area-inset-bottom)]">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium ${
                isActive ? "text-brand-600" : "text-stone-400"
              }`
            }
          >
            <n.icon className="w-5 h-5" />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
