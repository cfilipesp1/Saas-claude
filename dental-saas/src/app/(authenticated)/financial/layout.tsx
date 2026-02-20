import FinancialNav from "./FinancialNav";

export default function FinancialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <FinancialNav />
      {children}
    </div>
  );
}
