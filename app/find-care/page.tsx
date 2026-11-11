"use client";

import { saveBookingDraft } from "../../lib/bookingDraft";

export default function FindCare() {
  function handleSelectBookingFor(value: "myself" | "someoneElse") {
    saveBookingDraft({
      bookingFor: value,
    });
  }

  return (
    <main className="min-h-screen bg-white relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-45 pointer-events-none"
        style={{
          backgroundImage: "url('/who-needs-care.jpg')",
        }}
      />

      <div className="absolute inset-0 bg-white/45 pointer-events-none" />

      <nav className="relative z-50 flex justify-between items-start px-4 md:px-8 pt-2 md:pt-3 pb-2">
        <a href="/" className="flex items-start">
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity logo"
            className="h-20 md:h-24 w-auto max-w-[150px] md:max-w-none object-contain object-left"
          />
        </a>

        <div className="hidden md:flex items-center gap-4 text-sm font-semibold text-gray-800 pt-2">
          <a href="/" className="hover:text-purple-600">
            Home
          </a>

          <span className="text-gray-400">|</span>

          <a href="#" className="hover:text-purple-600">
            About Us
          </a>

          <span className="text-gray-400">|</span>

          <a href="#" className="hover:text-purple-600">
            Contact Us
          </a>
        </div>

        <details className="relative md:hidden z-50 pt-2">
          <summary
            aria-label="Open menu"
            className="list-none cursor-pointer flex flex-col gap-1.5 p-2 rounded-lg bg-white/95 border border-gray-200 shadow-sm active:scale-95 transition"
          >
            <span className="w-6 h-0.5 bg-gray-800 rounded-full" />
            <span className="w-6 h-0.5 bg-gray-800 rounded-full" />
            <span className="w-6 h-0.5 bg-gray-800 rounded-full" />
          </summary>

          <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden text-sm font-semibold text-gray-800 z-50">
            <a
              href="/"
              className="block px-4 py-3 active:bg-purple-50 hover:bg-purple-50 hover:text-purple-600"
            >
              Home
            </a>

            <a
              href="#"
              className="block px-4 py-3 active:bg-purple-50 hover:bg-purple-50 hover:text-purple-600"
            >
              About Us
            </a>

            <a
              href="#"
              className="block px-4 py-3 active:bg-purple-50 hover:bg-purple-50 hover:text-purple-600"
            >
              Contact Us
            </a>
          </div>
        </details>
      </nav>

      <section className="relative z-10 min-h-[78vh] flex flex-col items-center justify-center text-center px-6 -mt-6 md:mt-0">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
          Who needs care?
        </h1>

        <p className="text-lg md:text-xl text-gray-700 mb-8 md:mb-10 max-w-md">
          Tell us who you are booking care for.
        </p>

        <div className="flex flex-col gap-4 w-full max-w-sm">
          <a
            href="/find-care/account"
            onClick={() => handleSelectBookingFor("myself")}
            className="block w-full cursor-pointer touch-manipulation bg-purple-600 hover:bg-purple-700 active:bg-purple-800 active:scale-[0.98] transition-all text-white py-4 rounded-xl font-semibold text-center shadow-sm"
          >
            Myself
          </a>

          <a
            href="/find-care/account"
            onClick={() => handleSelectBookingFor("someoneElse")}
            className="block w-full cursor-pointer touch-manipulation bg-white/90 hover:bg-purple-50 active:bg-purple-100 active:scale-[0.98] transition-all border border-purple-600 text-purple-600 py-4 rounded-xl font-semibold text-center shadow-sm"
          >
            Someone Else
          </a>
        </div>
      </section>
    </main>
  );
}