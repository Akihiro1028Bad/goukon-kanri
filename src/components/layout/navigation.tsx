"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "ダッシュボード" },
  { href: "/events", label: "イベント一覧" },
  { href: "/participants", label: "参加者一覧" },
  { href: "/schedule", label: "スケジュール" },
  { href: "/reports", label: "収支レポート" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-56 border-r bg-gray-50 p-4">
      <h1 className="mb-6 text-lg font-bold">合コン管理</h1>
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`block rounded px-3 py-2 text-sm ${
                pathname === item.href
                  ? "bg-blue-100 font-medium text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
