"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/hot", label: "Hot List", icon: "⚡" },
  { href: "/opportunities", label: "All Opportunities", icon: "≡" },
  { href: "/analytics", label: "Analytics", icon: "◻" },
  { href: "/config", label: "Config", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col border-r border-[#30363d] bg-[#0d1117]">
      <div className="px-4 py-4 border-b border-[#30363d]">
        <div className="text-sm font-semibold text-[#e6edf3]">PrimeLayer</div>
        <div className="text-[11px] text-[#8b949e] mt-0.5">Contract Intel</div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors",
                active
                  ? "bg-[#21262d] text-[#e6edf3]"
                  : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50"
              )}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-[#30363d]">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
