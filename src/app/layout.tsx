import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Navigation } from "@/components/layout/navigation";

export const metadata: Metadata = {
  title: "合コン管理",
  description: "合コンイベント管理アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <div className="flex min-h-screen">
          <Navigation />
          <main className="flex-1 p-6">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
