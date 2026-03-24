import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/footer";

describe("Footer", () => {
  describe("著作権表示", () => {
    it("著作権記号と「Goukon Kanri」が表示される", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveTextContent("©");
      expect(footer).toHaveTextContent("Goukon Kanri");
    });

    it("現在の年が動的に表示される", () => {
      const currentYear = new Date().getFullYear();
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toHaveTextContent(
        String(currentYear)
      );
    });
  });

  describe("年の動的取得", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("2025年の場合は2025が表示される", () => {
      vi.setSystemTime(new Date("2025-06-15"));
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2025");
    });

    it("2030年の場合は2030が表示される", () => {
      vi.setSystemTime(new Date("2030-12-31"));
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2030");
    });

    it("年末年始の境界（2025年12月31日 23:59:59）", () => {
      vi.setSystemTime(new Date("2025-12-31T23:59:59"));
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2025");
    });

    it("年末年始の境界（2026年1月1日 00:00:00）", () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00"));
      render(<Footer />);

      expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026");
    });
  });

  describe("スタイリング", () => {
    it("footer 要素としてレンダリングされる", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer.tagName).toBe("FOOTER");
    });

    it("適切な CSS クラスが適用されている", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("border-t", "bg-gray-50", "py-4");
    });

    it("テキストに適切なスタイルが適用されている", () => {
      render(<Footer />);

      const paragraph = screen.getByRole("contentinfo").querySelector("p");
      expect(paragraph).toHaveClass("text-center", "text-sm", "text-gray-500");
    });
  });

  describe("表示形式", () => {
    it("著作権表示が正しい形式で表示される（© YYYY Goukon Kanri）", () => {
      const currentYear = new Date().getFullYear();
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveTextContent(`© ${currentYear} Goukon Kanri`);
    });
  });
});
