# Carerity — Caregiver Matching Discovery & Problem Analysis

**Document ID:** CAR-DISC-001  

**Version:** 0.2  

**Status:** Discovery in progress; matching operating rules approved 12 November 2026  

**Project:** Carerity  

**Business Domain:** Healthcare Services Marketplace  

**Prepared by:** Wale Afilaka  

**Document Type:** Business Analysis — Discovery Findings  

**Evidence Status:** Preliminary observations and hypotheses remain pending validation. Matching process rules in Section 5 are approved business requirements as of 12 November 2026.

---

## 1. Executive Summary

Carerity is developing a digital marketplace that connects customers requiring personal support and home-care services with eligible caregivers.

A critical business capability is the platform's ability to identify, engage, and confirm suitable caregivers within an acceptable timeframe while maintaining safety, qualification, availability, and care requirements.

This discovery assessment examines potential sources of caregiver-matching delays, identifies operational and system constraints, and establishes an evidence-based approach for evaluating matching performance.

On 12 November 2026, Carerity approved revised matching operating rules. Eligible caregivers are invited concurrently; invitations remain open for interest until customer confirmation, cancellation, or Admin closure of the search; only interested caregivers are presented to the customer, one at a time, ranked by match score; confirmation produces an exclusive assignment; and Admin intervention follows defined two-hour timers without automatically terminating the live search. These rules supersede the earlier top-10 / two-wave outreach model recorded in Section 5.2.

The discovery objective remains to identify opportunities to improve matching efficiency, customer experience, caregiver utilization, and operational scalability without compromising mandatory eligibility requirements.

## 2. Business Problem & Opportunity

### 2.1 Problem Statement

Caregiver matching may experience delays when the available pool of eligible caregivers is insufficient or when matching and confirmation processes introduce additional waiting time.

Potential contributing factors include:

- Caregiver availability relative to customer demand
- Geographic distribution of eligible caregivers
- Specialized care capability requirements
- Completeness and accuracy of caregiver information
- Interaction between mandatory eligibility rules and customer preferences
- Operational intervention and customer confirmation delays

The relative contribution of each factor has not yet been established.

### 2.2 Preliminary Performance Indicators

The following figures are preliminary working assumptions for analysis and are **not verified production performance measurements**.

| Indicator | Preliminary Figure | Validation Required |
|---|---|---|
| Average wait for non-immediate matches | Approximately 3.5 hours | Confirm measurement definition, population, and timestamps |
| Requests unmatched after one hour | Approximately 30% | Validate request cohort and match definition |
| Proposed performance objective | 80% matched within 30 minutes | Confirm feasibility and business approval |

These figures must not be used as established operational KPIs until supported by reliable system data or documented stakeholder evidence.

The 12 November 2026 matching-rule approval does not, by itself, validate these performance figures.

### 2.3 Business Impact

Potential consequences of delayed matching include:

- Reduced customer satisfaction
- Increased risk of unfulfilled care requests
- Greater manual workload for Operations
- Lower caregiver engagement and utilization
- Reduced customer retention and platform conversion
- Challenges scaling the marketplace into additional service areas

These impacts require prioritization and, where possible, quantitative assessment.

## 3. Initial Observations & Areas for Investigation

### 3.1 Time-Based Matching Performance

Preliminary analysis assumptions suggest:

- Approximately 42% of requests submitted after 4 PM may remain unmatched after one hour.
- Approximately 24% of requests submitted before 4 PM may remain unmatched after one hour.

**Analytical Interpretation:** Matching performance may vary by request submission time.

**Validation Approach:** Compare request volume, caregiver availability, matching outcomes, and confirmation times across equivalent time periods.

### 3.2 Geographic Caregiver Coverage

A preliminary assumption is that lower-density service areas may have approximately half as many potential caregivers per active request as core service areas.

**Analytical Interpretation:** Geographic coverage may influence the number of eligible caregivers available for matching.

**Validation Approach:** Compare caregiver supply, request demand, geographic eligibility, and match outcomes by service area.

### 3.3 Specialized Care Requirements

Preliminary figures suggest:

- Approximately 22% of requests may require dementia or memory-care support.
- Approximately 14% of approved caregivers may have the relevant capability explicitly recorded.

**Analytical Interpretation:** There may be a gap between specialized care demand and recorded caregiver capability.

These percentages describe different populations and do not independently establish a supply shortage.

**Validation Approach:** Evaluate qualified caregiver availability against actual specialized-care requests during corresponding service periods.

### 3.4 Caregiver Data Quality

Potential data-quality issues include:

- Incomplete care capability records
- Outdated availability schedules
- Missing or inaccurate service-area information
- Inconsistent caregiver profile updates

**Analytical Interpretation:** Data quality may affect eligibility determination and matching outcomes.

**Validation Approach:** Assess profile completeness, record freshness, and matching exclusion reasons.

## 4. Existing Business Rules & Matching Constraints

The matching capability must account for the following eligibility considerations:

1. Caregiver approval and verification status
2. Availability for the requested service period
3. Geographic proximity and permitted service radius
4. Mandatory care qualifications and capabilities
5. Hard customer restrictions, including mandatory caregiver gender where specified
6. Customer language preferences, where applicable as a mandatory or preference-based rule

### 4.1 Mandatory Requirements

The following must not be bypassed during automated matching, Admin-renewed outreach, or manual sourcing:

- Required caregiver verification
- Mandatory care qualifications
- Safety and compliance requirements
- Actual caregiver availability
- Essential customer care requirements
- Hard customer restrictions, including a mandatory caregiver gender requirement when the customer has specified one
- Scheduling and conflict checks that prevent overlapping confirmed assignments

Admin may source and assign a caregiver only if the customer approves the assignment and the caregiver satisfies the same mandatory eligibility, scheduling and conflict checks as automated assignment.

### 4.2 Configurable Preferences

Non-mandatory preferences may be assessed for controlled flexibility, subject to customer consent and approved business rules.

Any flexibility must be clearly distinguished from mandatory eligibility requirements and hard customer restrictions.

## 5. Approved Matching Process (12 November 2026)

Carerity's matching workflow comprises automated caregiver identification and invitation, non-exclusive caregiver interest, sequential customer review of interested caregivers, confirmed assignment, and Admin escalation when defined timers expire.

### 5.1 Approved Operating Rules

1. **Eligibility filter.** Invite all caregivers who pass mandatory eligibility, availability, verification and proximity checks. Do not limit outreach to a top-N subset.
2. **Open invitations.** Caregiver invitations remain open for interest until the customer confirms an assignment, the request is cancelled, or Admin closes the search. There is no automatic wave-based offer expiry.
3. **Non-exclusive interest.** A caregiver's expression of interest does not reserve the request. Multiple eligible caregivers may express interest in the same request while invitations remain open.
4. **Customer presentation.** Present only caregivers who have expressed interest and who still pass eligibility and availability checks. Present them one at a time, ranked by match score. Do not rank or sequence presentation by response time. Waiting candidates may be re-ranked when appropriate; the caregiver currently being reviewed must not be unexpectedly replaced.
5. **Customer decline.** The customer may decline the presented caregiver and view the next highest-ranked interested caregiver.
6. **Customer confirmation.** Confirmation triggers atomic assignment: revalidate conflicts, close all remaining offers on the request, and terminate matching timers immediately.
7. **No-interest escalation.** If no caregiver expresses interest within two hours of matching start, Admin intervention begins. The live search is not terminated automatically.
8. **Customer decision deadline.** When the first valid caregiver interest is recorded, start a separate two-hour customer decision timer. This timer begins whether or not the customer has opened the matching screen, and is independent of the no-interest escalation timer. If the customer has not confirmed an assignment when this timer expires, Admin intervention begins. The live search is not terminated automatically.
9. **Admin controls.** At either two-hour escalation threshold, Admin may monitor matching, continue it, pause it, stop it, or close the search. Admin may initiate a one-hour renewed outreach, or manually source caregivers. Manual assignment requires customer approval and the same mandatory eligibility, scheduling and conflict checks as automated assignment. Admin may also close the request as unavailable.
10. **Notifications.** Matching events must continue to generate in-app and push notifications for the affected customer, caregiver and, where applicable, Admin.

These rules are approved business requirements. Implementation evidence against the live application remains a separate current-state assessment.

### 5.2 Superseded Matching Rules

The following design, previously recorded as the intended product matching model, is **superseded** by the 12 November 2026 approval and must not be treated as current requirements:

| Superseded rule | Prior intent | Replacement |
|---|---|---|
| Top-10 eligible-caregiver outreach | Limit invitations to a ranked subset of eligible caregivers | Invite all caregivers who pass mandatory eligibility, availability, verification and proximity checks |
| Two-wave / time-based outreach | Release invitations in sequential time-based waves | Concurrent invitation of the full eligible set at matching start; invitations remain open until confirmation, cancellation or Admin closure |
| Automatic wave-based offer expiry | Offers expire when a wave ends or a subsequent wave starts | No automatic wave-based offer expiry; offers close on customer confirmation, request cancellation or Admin closure of the search |
| Presentation ordered by caregiver response time | Prefer faster respondents to the customer | Present interested caregivers one at a time, ordered by match score after eligibility and availability checks; re-rank waiting candidates without replacing the caregiver currently under review |
| Automatic search termination at SLA expiry | Matching stops when an outreach or escalation timer expires | At either two-hour threshold, Admin intervention begins; the live search continues unless Admin pauses, stops or closes it |

Historical discovery notes that ranked, time-based outreach waves were part of the earlier product design remain valid as a record of that design. They are not current operating rules.

### 5.3 Operational Questions Still Requiring Evidence

The approved timers and workflow define expected process behaviour. The following measurement questions remain open:

- At which stage does the greatest delay currently occur?
- How quickly do eligible caregivers express interest under concurrent, open invitation?
- How long do customers take to confirm or decline a presented caregiver?
- What proportion of requests reach the two-hour no-interest escalation?
- What proportion of requests exhaust the two-hour customer decision window?
- How often does Admin continue, pause, stop or close a live search after escalation?
- How effective are Admin renewed outreach and manual assignment?
- Which system events are currently recorded for analysis?

## 6. Root-Cause Hypotheses

### H1 — Caregiver Availability

**Hypothesis:** Caregiver availability during periods of elevated demand contributes to matching delays.

**Required Evidence:**

- Request volume by hour and day
- Eligible caregiver availability by hour and day
- Matching duration and outcome by time period

### H2 — Specialized Care Capability

**Hypothesis:** Availability of caregivers with required specialized capabilities may be insufficient during certain request periods.

**Required Evidence:**

- Requests by care capability
- Approved caregivers by verified capability
- Caregiver availability during requested care periods
- Matching success rates by care type

### H3 — Geographic Distribution

**Hypothesis:** Geographic differences in eligible caregiver supply contribute to variation in matching performance.

**Required Evidence:**

- Care requests by service area
- Eligible caregivers by geographic area
- Service-radius eligibility results
- Matching performance by geography

### H4 — Caregiver Profile Data Quality

**Hypothesis:** Incomplete or outdated caregiver information may exclude otherwise eligible caregivers.

**Required Evidence:**

- Profile completeness
- Availability update timestamps
- Capability record completeness
- Matching exclusion reasons

### H5 — Combined Matching Constraints

**Hypothesis:** Interactions between multiple matching constraints may substantially reduce the eligible caregiver pool.

**Required Evidence:**

- Eligible caregiver counts at each filtering stage
- Exclusion reasons by business rule
- Matching outcomes by combinations of requirements
- Mandatory versus preference-based exclusions, including hard gender restrictions

**Assessment Status:** All hypotheses remain open pending evidence-based evaluation.

## 7. Data Requirements & Measurement Framework

The investigation will assess whether Carerity's existing data model supports the following information requirements.

| Data Domain | Required Information | Business Purpose |
|---|---|---|
| Care Requests | Request ID, creation time, requested care period, care type | Measure demand |
| Caregivers | Caregiver ID, approval status, qualifications, capabilities, gender where required for restriction checks | Assess eligible supply |
| Availability | Available dates, times, last update | Evaluate capacity |
| Geography | Service location, caregiver service radius | Assess geographic coverage |
| Matching | Search start, eligibility outcomes, invitation timestamps, match scores, search pause/stop/close | Measure process performance |
| Interest | Caregiver interest timestamps; first valid interest timestamp that starts the customer decision timer, independent of whether the customer has opened the matching screen | Measure caregiver response and timer start |
| Assignment | Customer confirmation, conflict revalidation, offer closure and assignment timestamps | Measure completed matches |
| Timers | No-interest two-hour timer; customer-decision two-hour timer; Admin one-hour renewed outreach; timer events must not imply automatic search termination | Assess SLA adherence and escalation |
| Operations | Escalations, continue/pause/stop/close, renewed outreach, manual sourcing with customer approval, unavailable closures | Assess intervention effectiveness |
| Notifications | In-app and push notification events for matching, interest, presentation, confirmation and escalation | Confirm communication coverage |

### 7.1 Proposed Performance Measures

- Median and average time to confirmed assignment
- Percentage of requests confirmed within 30 minutes
- Percentage of requests unmatched after 60 minutes
- Eligible caregivers per active request
- Caregiver invitation coverage (eligible invited versus eligible identified)
- Caregiver interest rate
- Customer confirmation rate and decline-to-next rate
- Two-hour no-interest escalation rate
- Two-hour customer decision expiry rate
- Admin continue / pause / stop / close rates after escalation
- Manual escalation and Admin resolution outcomes
- Unfulfilled / closed-as-unavailable request rate

Metric definitions, calculation logic, and reporting populations must be agreed before implementation.

A successful match is defined as a customer-confirmed assignment, not caregiver interest alone.

## 8. Outstanding Discovery Questions

Resolved by the 12 November 2026 approval:

1. A successful match is a customer-confirmed assignment, not caregiver interest alone.
2. Matching outreach is not limited to a top-10 subset and is not released in two waves.
3. Caregiver invitations remain open for interest until customer confirmation, request cancellation, or Admin closure of the search. Automatic wave-based offer expiry is removed.
4. Interested caregivers are presented one at a time by match score after eligibility and availability checks. Waiting candidates may be re-ranked; the caregiver currently under review is not unexpectedly replaced.
5. Defined SLA timers are: two hours with no caregiver interest (Admin intervention); two hours for customer decision after the first valid interest is recorded, whether or not the customer has opened the matching screen; one hour for Admin renewed outreach. Neither two-hour threshold automatically terminates the live search.
6. Admin manual assignment requires customer approval and the same mandatory eligibility, scheduling and conflict checks as automated assignment.

Still open:

1. What is the agreed definition of a delayed match relative to the approved timers and the proposed 30-minute objective?
2. What constitutes an unsuccessful or unfulfilled care request versus an Admin closure as unavailable?
3. Which matching stages account for the greatest elapsed time in the current application?
4. How do caregiver availability and demand vary throughout the day?
5. Which mandatory requirements most frequently reduce the eligible pool, including gender restrictions?
6. How reliable and current are caregiver availability records?
7. How does matching performance differ across service areas?
8. How frequently are requests escalated to Admin under the two-hour no-interest rule?
9. What percentage of escalated requests result in successful assignments?
10. Which required timestamps and events are currently captured?
11. What performance objectives are operationally feasible and commercially meaningful?

## 9. Recommended Analysis Activities

### Activity 1 — Current-State Assessment

Review the existing Carerity application, matching workflow, business rules, and relevant technical documentation against the approved 12 November 2026 operating rules.

**Deliverable:** Current-State Process Assessment

### Activity 2 — Data Model Review

Identify existing database tables, primary keys, foreign keys, relevant fields, and matching event timestamps, including timer, interest, offer-closure and notification events.

**Deliverable:** Data Inventory & Entity Relationship Assessment

### Activity 3 — Hypothesis Validation

Translate each root-cause hypothesis into measurable business questions and develop SQL queries to evaluate available data.

**Deliverable:** Hypothesis & Evidence Matrix

### Activity 4 — Requirements Analysis

Document validated business, stakeholder, functional, non-functional, and data requirements, using Section 5 as the approved matching baseline.

**Deliverable:** Requirements Specification & Traceability Matrix

### Activity 5 — Solution Assessment

Evaluate potential improvements against business objectives, technical feasibility, operational impact, and compliance requirements.

**Deliverable:** Options Assessment & Recommendations

### Activity 6 — Delivery & Validation

Translate approved changes into actionable backlog items, acceptance criteria, and test scenarios.

**Deliverables:** User Stories, Acceptance Criteria, UAT Evidence & Change Log

## 10. Risks, Assumptions & Dependencies

### Risks

- Incomplete event logging may prevent accurate performance measurement, including timer start/stop, offer closure and Admin pause/stop/close actions.
- Caregiver profile data may not reliably reflect real-time availability.
- Matching optimization could inadvertently weaken essential eligibility safeguards if requirements are not clearly separated.
- Concurrent invitation of the full eligible set, with invitations remaining open until confirmation, cancellation or Admin closure, may increase notification volume; this must be monitored operationally.
- Insufficient operational data may limit the reliability of conclusions.

### Assumptions

- Matching events can be identified within the existing application or database.
- Caregiver eligibility rules, including hard gender restrictions, can be reviewed and documented.
- Relevant stakeholders can clarify operational definitions and expected outcomes.
- The 12 November 2026 matching operating rules remain the approved baseline until a further recorded decision supersedes them.

### Dependencies

- Access to the current application architecture and database schema
- Confirmation of existing matching business rules against the approved operating model
- Availability of reliable data for analysis
- Business approval of proposed performance targets

## 11. Decision Log

| Date | Decision | Status |
|---|---|---|
| 12 November 2026 | Replace top-10 / two-wave outreach with invitation of all eligible caregivers; keep invitations open until confirmation, cancellation or Admin closure (no automatic wave-based offer expiry); present interested caregivers one at a time by match score after eligibility and availability checks, re-ranking waiting candidates without replacing the caregiver under review; start the customer decision timer on first valid interest regardless of whether the customer has opened the matching screen; at either two-hour threshold begin Admin intervention without automatically terminating the live search; Admin may continue, pause, stop or close the search, run a one-hour renewed outreach, or manually source caregivers subject to customer approval and the same eligibility, scheduling and conflict checks as automated assignment; preserve hard restrictions including mandatory caregiver gender; retain in-app and push notifications. | Approved |
| Prior design (superseded) | Ranked outreach limited to a top subset of eligible caregivers, released in time-based waves with automatic wave-based offer expiry, with customer review of interested caregivers and operational escalation of unresolved requests. | Superseded |

## 12. Next Steps

1. Inspect the existing Carerity project architecture against the approved matching rules.
2. Identify relevant Supabase/PostgreSQL tables and relationships.
3. Map the current caregiver-matching process and record gaps versus Section 5.
4. Establish measurable business questions for hypotheses H1–H5.
5. Develop SQL queries to assess available evidence.
6. Document validated findings and evidence gaps.
7. Recommend improvements based on verified analysis.

---

**Document Status:** Discovery in progress; matching operating rules approved 12 November 2026  

**Version:** 0.2  

**Next Deliverable:** Current-State Data Model & Matching Process Assessment
