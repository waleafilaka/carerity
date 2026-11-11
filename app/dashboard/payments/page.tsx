"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import DashboardLayout from "../../../components/DashboardLayout";

import {
  getBookingDraft,
} from "../../../lib/bookingDraft";

const payments = [
  {
    id: "CAR-061626",
    date: "Jun 16, 2026",
    description:
      "Care visit with Sarah M.",
    amount: "$304.00",
    status: "Paid",
  },
  {
    id: "CAR-061226",
    date: "Jun 12, 2026",
    description:
      "Care visit with Grace T.",
    amount: "$304.00",
    status: "Paid",
  },
  {
    id: "CAR-060826",
    date: "Jun 8, 2026",
    description:
      "Care visit with Sarah M.",
    amount: "$228.00",
    status: "Paid",
  },
];

export default function PaymentsPage() {
  const searchParams =
    useSearchParams();

  const [
    paymentEmail,
    setPaymentEmail,
  ] = useState("");

  useEffect(() => {
    const booking =
      getBookingDraft();

    setPaymentEmail(
      booking.email || ""
    );
  }, []);

  const updateStatus =
    searchParams.get(
      "payment_method"
    );

  return (
    <DashboardLayout
      activeItem="Payments"
      role="customer"
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <p className="text-sm font-semibold text-purple-600">
            Billing
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mt-1">
            Payments
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage payment
            methods and view
            charges.
          </p>
        </div>

        {updateStatus ===
          "updated" && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
            ✓ Your payment
            method was updated
            successfully.
          </div>
        )}

        {updateStatus ===
          "cancelled" && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Payment method update
            was cancelled. Your
            existing payment
            method has not been
            changed.
          </div>
        )}

        <section className="rounded-3xl border border-purple-200 bg-white p-5 shadow-sm mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center text-xl">
                💳
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Payment method
                </p>

                <p className="font-bold mt-1">
                  Saved securely
                  with Stripe
                </p>

                {paymentEmail && (
                  <p className="text-xs text-gray-500 mt-1">
                    {paymentEmail}
                  </p>
                )}
              </div>
            </div>

            <a
              href="/find-care/payment-method?mode=manage"
              className="rounded-xl border border-purple-300 px-4 py-2.5 text-center text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              Update Payment
              Method
            </a>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Summary
            label="Paid this month"
            value="$836.00"
          />

          <Summary
            label="Pending"
            value="$0.00"
          />
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">
            Payment history
          </h2>

          <p className="text-sm text-gray-500 mt-1 mb-4">
            Charges and receipts.
          </p>

          <div className="space-y-3">
            {payments.map(
              (payment) => (
                <div
                  key={
                    payment.id
                  }
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">
                        {
                          payment.description
                        }
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        {
                          payment.date
                        }{" "}
                        ·{" "}
                        {
                          payment.id
                        }
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        {
                          payment.amount
                        }
                      </p>

                      <p className="text-xs font-bold text-green-700 mt-1">
                        ✓{" "}
                        {
                          payment.status
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      className="text-sm font-semibold text-purple-700"
                    >
                      View Receipt
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        <p className="text-xs text-gray-400 text-center mt-5">
          Payments are processed
          securely by Stripe.
        </p>
      </div>
    </DashboardLayout>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="text-2xl font-bold mt-2">
        {value}
      </p>
    </div>
  );
}
