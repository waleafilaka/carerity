# Carerity — Pricing & Booking Requirements

**Status:** Approved pricing baseline; implementation pending  
**Currency:** CAD  
**Scope:** Customer pricing, caregiver compensation, booking rules, recurring care and payment processing

## 1. Pricing Structure


| Pricing component              | Approved rule                   |
| ------------------------------ | ------------------------------- |
| Standard customer rate         | $31.99/hour                     |
| Recurring customer rate        | $29.99/hour                     |
| Recurring eligibility          | Minimum one-month commitment    |
| Caregiver base compensation    | $23.00/hour                     |
| One-hour visit surcharge       | $10.00                          |
| Two-hour visit surcharge       | $7.00                           |
| Three-hour visit surcharge     | $4.00                           |
| Visits of four hours or longer | No surcharge                    |
| Surcharge allocation           | 60% Carerity / 40% caregiver    |
| Minimum visit duration         | 1 hour                          |
| Standard visit threshold       | 4 hours                         |
| Maximum service hours          | 12 hours per caregiver per day  |
| Recurring billing              | Weekly                          |
| Caregiver payouts              | Weekly after completed services |


Customer-facing prices include an allowance for payment processing. No separate Stripe processing surcharge is added at checkout.

## 2. Booking and Compensation Rules

**Customer total:** Hourly customer rate × booked hours + applicable short-visit surcharge.

**Caregiver earnings:** $23 × service hours + 40% of applicable surcharge.

**Carerity contribution:** Customer payment − caregiver compensation − attributable processing fees.

The system must calculate and retain these amounts consistently across booking, payment, caregiver earnings, invoicing and reporting.

Short visits of 1–3 hours are permitted at premium rates. Visits of 4–12 hours carry no short-visit surcharge.

A caregiver may accept multiple non-overlapping assignments, subject to availability, travel feasibility and the 12-hour daily limit.

Confirmed bookings must preserve their agreed pricing even when administrators subsequently change rates.

## 3. Standard Booking Financial Illustration

Assumptions: one payment per booking and estimated Stripe processing of 2.9% + $0.30.


| Item                              | 1 hour     | 2 hours    | 3 hours    | 4 hours     |
| --------------------------------- | ---------- | ---------- | ---------- | ----------- |
| Customer hourly charges           | $31.99     | $63.98     | $95.97     | $127.96     |
| Short-visit surcharge             | $10.00     | $7.00      | $4.00      | $0.00       |
| **Customer pays**                 | **$41.99** | **$70.98** | **$99.97** | **$127.96** |
| Caregiver base compensation       | $23.00     | $46.00     | $69.00     | $92.00      |
| Caregiver surcharge share         | $4.00      | $2.80      | $1.60      | $0.00       |
| **Caregiver earns**               | **$27.00** | **$48.80** | **$70.60** | **$92.00**  |
| Platform spread before processing | $14.99     | $22.18     | $29.37     | $35.96      |
| Estimated processing fee          | $1.52      | $2.36      | $3.20      | $4.01       |
| **Carerity contribution**         | **$13.47** | **$19.82** | **$26.17** | **$31.95**  |


These figures are estimates before taxes, refunds, payout fees, insurance, support and other operating costs.

## 4. Recurring Care

Qualifying recurring-care customers receive a $2/hour discount against standard pricing.

A recurring arrangement requires a minimum one-month commitment. Visits are scheduled under an agreed recurring plan, billed weekly and managed individually for cancellations or rescheduling.

### Example — Three Four-Hour Visits Weekly


| Item                             | Standard   | Recurring  |
| -------------------------------- | ---------- | ---------- |
| Hourly customer rate             | $31.99     | $29.99     |
| Weekly customer charge           | $383.88    | $359.88    |
| Weekly caregiver compensation    | $276.00    | $276.00    |
| Estimated Stripe fee             | $11.43     | $10.74     |
| **Weekly Carerity contribution** | **$96.45** | **$73.14** |


Assumes one weekly payment per invoice.

**Customer savings:** $24 weekly, $96 over four weeks, or $1,248 over 52 weeks at the same service schedule.

### Customer Marketing Proposition

**Quality care from $29.99/hour. Save almost $100 every four weeks with recurring care.**

The savings illustration assumes 12 hours of care weekly over four weeks, compared with standard pricing. Actual savings depend on hours booked, surcharges and applicable taxes.

## 5. Centralized Pricing Architecture

Pricing must be controlled through an administrator-managed configuration in Supabase, with one authoritative server-side calculation engine.

The configuration must support customer rates, caregiver rates, short-visit surcharge tiers, surcharge allocation, recurring eligibility, effective dates and version history.

The same calculation engine must support:

- Customer quotes and booking confirmation.
- Caregiver job offers and earnings.
- Stripe payment calculations.
- Recurring invoices and weekly billing.
- Caregiver payouts.
- Financial reporting and reconciliation.

New pricing configurations apply prospectively. Existing confirmed bookings retain their accepted pricing snapshots.

All administrative changes must be recorded with the responsible user, effective date and previous/new values.

## 6. Core System Requirements


| ID    | Requirement                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------------- |
| PR-01 | Administrators can manage pricing centrally without code changes.                                               |
| PR-02 | Customer quotes apply the correct standard or recurring rate.                                                   |
| PR-03 | Short-visit surcharges are calculated from configured duration tiers.                                           |
| PR-04 | Surcharge revenue is allocated 60% to Carerity and 40% to the caregiver.                                        |
| PR-05 | All booking and payment functions use the same pricing engine.                                                  |
| PR-06 | Confirmed bookings preserve pricing snapshots and rule versions.                                                |
| PR-07 | Pricing changes have effective dates and audit records.                                                         |
| PR-08 | Recurring discounts require an eligible commitment.                                                             |
| PR-09 | Recurring invoices are generated weekly; caregiver payouts follow completed services.                           |
| PR-10 | Actual payment fees are tracked without double-counting.                                                        |
| PR-11 | Reporting separates customer charges, caregiver compensation, fees and platform contribution.                   |
| PR-12 | Customer-facing prices and promotions reflect active pricing rules.                                             |
| PR-13 | Cancellations affect the applicable visit, subject to agreed policy.                                            |
| PR-14 | Booking confirmation validates availability, travel feasibility, overlapping assignments and daily-hour limits. |




## 7. Outstanding Business Decisions

The following must be resolved before implementation is finalized:

- Fractional-hour duration and surcharge boundaries.
- Exact recurring commitment start, renewal and early cancellation rules.
- Cancellation, no-show and refund policies.
- Taxes and payment-processing obligations.
- Actual Stripe and Stripe Connect fees.
- Price changes during existing recurring commitments.
- Caregiver employment or independent-contractor classification and associated obligations.



## 8. Implementation Position

The current application must be assessed against these requirements before development begins.

The pricing configuration, booking calculations, payment processing, recurring billing and caregiver payouts must be validated together to prevent inconsistencies across web and mobile.