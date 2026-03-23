import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";

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
        <div className="flex min-h-screen min-w-0 flex-col">
          <div className="flex flex-1 min-w-0">
            <Navigation />
            <main className="min-w-0 flex-1 p-4 pt-16 md:p-6 md:pt-6">
              {children}
            </main>
          </div>
          <Footer />
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
