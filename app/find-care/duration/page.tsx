export default function FindCare() {
    return (
      <main className="min-h-screen bg-white relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: "url('/who-needs-care.jpg')" }}
        />
        <div className="absolute inset-0 bg-white/55" />
  
        <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">
            Who needs care?
          </h1>
  
          <p className="text-xl text-gray-700 mb-10 max-w-md">
            Tell us who you are booking care for.
          </p>
  
          <div className="flex flex-col gap-5 w-full max-w-md">
            <a
              href="/find-care/account"
              className="bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-xl font-bold text-center text-lg"
            >
              Myself
            </a>
  
            <a
              href="/find-care/account"
              className="bg-white/90 hover:bg-purple-50 border border-purple-600 text-purple-600 py-5 rounded-xl font-bold text-center text-lg"
            >
              Someone Else
            </a>
          </div>
        </section>
      </main>
    );
  }
  