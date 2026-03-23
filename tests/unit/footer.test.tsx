import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/footer";

describe("Footer", () => {
  describe("著作権表示", () => {
    it("現在の年で著作権表示がレンダリングされる", () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(`© ${currentYear} Goukon Kanri`)).toBeInTheDocument();
    });

    it("footer要素としてレンダリングされる", () => {
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    });
  });

  describe("年の動的取得", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("2026年の場合、2026が表示される", () => {
      vi.setSystemTime(new Date("2026-06-15"));
      render(<Footer />);

      expect(screen.getByText("© 2026 Goukon Kanri")).toBeInTheDocument();
    });

    it("2030年の場合、2030が表示される", () => {
      vi.setSystemTime(new Date("2030-01-01"));
      render(<Footer />);

      expect(screen.getByText("© 2030 Goukon Kanri")).toBeInTheDocument();
    });

    it("年末年始の境界（2026-12-31 23:59:59）で正しい年が表示される", () => {
      vi.setSystemTime(new Date("2026-12-31T23:59:59"));
      render(<Footer />);

      expect(screen.getByText("© 2026 Goukon Kanri")).toBeInTheDocument();
    });

    it("年末年始の境界（2027-01-01 00:00:00）で正しい年が表示される", () => {
      vi.setSystemTime(new Date("2027-01-01T00:00:00"));
      render(<Footer />);

      expect(screen.getByText("© 2027 Goukon Kanri")).toBeInTheDocument();
    });
  });

  describe("スタイリング", () => {
    it("中央揃えのクラスが適用されている", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("text-center");
    });

    it("小さめのフォントサイズのクラスが適用されている", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("text-sm");
    });

    it("グレー系の色のクラスが適用されている", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("text-gray-500");
    });
  });
});
