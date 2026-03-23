export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-4 text-center text-sm text-gray-500">
      © {currentYear} Goukon Kanri
    </footer>
  );
}
