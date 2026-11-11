type PageCardProps = {
  children: React.ReactNode;
  maxWidth?: string;
};

export default function PageCard({
  children,
  maxWidth = "max-w-xl",
}: PageCardProps) {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 py-5 sm:py-8 text-gray-900">
      <section
        className={`w-full ${maxWidth} bg-white border border-gray-200 rounded-3xl shadow-sm px-5 sm:px-6 py-5 sm:py-6`}
      >
        {children}
      </section>
    </main>
  );
}
