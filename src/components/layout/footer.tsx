export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-gray-50 py-4">
      <p className="text-center text-sm text-gray-500">
        © {currentYear} Goukon Kanri
      </p>
    </footer>
  );
}
