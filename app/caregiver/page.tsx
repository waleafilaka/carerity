"use client";

export default function CaregiverPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a href="/" aria-label="Carerity home">
          <img
            src="/carerityblacklogo2.png"
            alt="Carerity"
            className="h-16 w-auto object-contain sm:h-20"
          />
        </a>

        <a
          href="/caregiver/login"
          className="rounded-full border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          Sign In
        </a>
      </nav>

      <section className="mx-auto flex min-h-[75vh] max-w-5xl items-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Caregiver Opportunities
            </p>

            <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
              Care on your terms.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
              Choose when you are available, work closer to home, and accept
              care opportunities that fit you.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="/caregiver/join"
                className="rounded-xl bg-emerald-600 px-6 py-3.5 text-center font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
              >
                Apply to Join
              </a>

              <a
                href="/caregiver/login"
                className="rounded-xl border border-emerald-300 bg-white px-6 py-3.5 text-center font-semibold text-emerald-700 transition hover:bg-emerald-50 active:scale-[0.98]"
              >
                Caregiver Sign In
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm font-bold text-emerald-700">
              Why caregivers join
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Work with more flexibility
            </h2>

            <div className="mt-5 space-y-3">
              <Feature
                icon="✓"
                title="Choose your work"
                description="Accept the care opportunities that suit you."
              />

              <Feature
                icon="📅"
                title="Set your availability"
                description="Choose when you are available to provide care."
              />

              <Feature
                icon="📍"
                title="Work closer to home"
                description="Choose how far you are willing to travel."
              />

              <Feature
                icon="$"
                title="Earn extra income"
                description="See expected earnings before accepting care."
              />
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-bold text-gray-900">
                Already have an account?
              </p>

              <a
                href="/caregiver/login"
                className="mt-2 inline-block text-sm font-bold text-emerald-700 hover:underline"
              >
                Sign in →
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 pb-8 text-center">
        <a
          href="/"
          className="text-sm font-semibold text-gray-500 hover:text-purple-700"
        >
          ← Back to Carerity
        </a>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-gray-200 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">
        {icon}
      </div>

      <div>
        <p className="font-bold text-gray-900">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}
