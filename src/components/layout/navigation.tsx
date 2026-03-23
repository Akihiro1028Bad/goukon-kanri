"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: "ダッシュボード" },
  { href: "/events", label: "イベント一覧" },
  { href: "/participants", label: "参加者一覧" },
  { href: "/schedule", label: "スケジュール" },
  { href: "/reports", label: "収支レポート" },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {navItems.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onClick}
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
  );
}

export function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <nav className="hidden md:block w-56 border-r bg-gray-50 p-4">
        <h1 className="mb-6 text-lg font-bold">合コン管理</h1>
        <NavLinks />
      </nav>

      {/* Mobile hamburger menu */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center border-b bg-white p-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="sm" aria-label="メニュー">
                <MenuIcon className="h-5 w-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-64 p-4">
            <SheetHeader>
              <SheetTitle>合コン管理</SheetTitle>
            </SheetHeader>
            <nav className="mt-4">
              <NavLinks onClick={() => setOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>
        <span className="ml-3 font-bold text-sm">合コン管理</span>
      </div>
    </>
  );
}
