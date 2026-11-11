"use client";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      {/* Background image */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-50"
        style={{
          backgroundImage: "url('/hero-care.jpg')",
        }}
      />

      {/* Soft white overlay */}
      <div className="pointer-events-none absolute inset-0 bg-white/50" />

      {/* HEADER */}
      <nav className="relative z-50 flex items-start justify-between px-4 pb-2 pt-2 md:px-8 md:pt-3">
        <a
          href="/"
          aria-label="Carerity home"
          className="touch-manipulation"
        >
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity logo"
            className="h-20 w-auto max-w-[150px] object-contain object-left md:h-24 md:max-w-none"
          />
        </a>

        {/* Desktop caregiver navigation */}
        <div className="hidden items-center gap-3 pt-2 text-sm font-semibold md:flex">
          <a
            href="/"
            className="px-2 py-2 text-gray-800 transition hover:text-purple-600"
          >
            Home
          </a>

          <a
            href="#"
            className="px-2 py-2 text-gray-800 transition hover:text-purple-600"
          >
            About Us
          </a>

          <a
            href="#"
            className="px-2 py-2 text-gray-800 transition hover:text-purple-600"
          >
            Contact Us
          </a>

          <a
            href="/caregiver/join"
            className="touch-manipulation rounded-full border border-emerald-300 bg-white/90 px-4 py-2.5 text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-[0.98]"
          >
            Join as a Caregiver
          </a>

          <a
            href="/caregiver/login"
            className="touch-manipulation rounded-full bg-emerald-600 px-5 py-2.5 text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            Caregiver Sign In
          </a>
        </div>

        {/* Mobile menu */}
        <details className="relative z-50 pt-2 md:hidden">
          <summary
            aria-label="Open menu"
            className="flex min-h-11 min-w-11 cursor-pointer touch-manipulation list-none flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white/95 p-2 shadow-sm"
          >
            <span className="h-0.5 w-6 rounded-full bg-gray-800" />
            <span className="h-0.5 w-6 rounded-full bg-gray-800" />
            <span className="h-0.5 w-6 rounded-full bg-gray-800" />
          </summary>

          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white text-sm shadow-xl">
            <a
              href="/"
              className="block min-h-12 touch-manipulation px-4 py-3 font-semibold text-gray-800 hover:bg-purple-50"
            >
              Home
            </a>

            <a
              href="#"
              className="block min-h-12 touch-manipulation px-4 py-3 font-semibold text-gray-800 hover:bg-purple-50"
            >
              About Us
            </a>

            <a
              href="#"
              className="block min-h-12 touch-manipulation px-4 py-3 font-semibold text-gray-800 hover:bg-purple-50"
            >
              Contact Us
            </a>

            <div className="border-t border-gray-100" />

            <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">
              Caregivers
            </p>

            <a
              href="/caregiver/join"
              className="block min-h-12 touch-manipulation px-4 py-3 font-bold text-emerald-700 hover:bg-emerald-50"
            >
              Join as a Caregiver
            </a>

            <a
              href="/caregiver/login"
              className="block min-h-12 touch-manipulation bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700"
            >
              Caregiver Sign In
            </a>
          </div>
        </details>
      </nav>

      {/* HERO */}
      <section className="relative z-10 -mt-8 flex min-h-[74vh] flex-col items-center justify-center px-5 text-center md:-mt-16 md:min-h-[72vh]">
        <img
          src="/careritylogoonly3.png"
          alt="Carerity icon"
          className="-mb-14 h-40 w-40 object-contain md:-mb-20 md:h-56 md:w-56"
        />

        <h1 className="mb-3 text-5xl font-bold text-gray-900 md:text-6xl">
          Carerity
        </h1>

        <p className="mb-8 text-lg text-gray-700 md:mb-10 md:text-xl">
          Care, when you need it.
        </p>

        {/* Customer actions */}
        <div className="w-full max-w-sm space-y-3">
          <a
            href="/find-care"
            className="block min-h-[54px] w-full touch-manipulation rounded-xl bg-purple-600 px-5 py-4 text-center font-semibold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-[0.98] active:bg-purple-800"
          >
            Find Care
          </a>

          <a
            href="/login"
            className="block min-h-[52px] w-full touch-manipulation rounded-xl border border-purple-300 bg-white/90 px-5 py-3.5 text-center font-semibold text-purple-700 shadow-sm backdrop-blur-sm transition-all hover:bg-purple-50 active:scale-[0.98]"
          >
            Sign In
          </a>

          <p className="pt-1 text-xs text-gray-600">
            Already have a Carerity account? Sign in to manage your care.
          </p>
        </div>
      </section>
    </main>
  );
}
