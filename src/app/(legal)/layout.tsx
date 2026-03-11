export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="bg-main-gradient" />
      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4 xs:px-6 sm:px-12 lg:px-20 max-w-4xl">
          {children}
        </div>
      </main>
    </div>
  );
}
