# Carerity — Caregiver Matching Discovery & Problem Analysis

**Document ID:** CAR-DISC-001  

**Version:** 0.1  

**Status:** Draft — Discovery & Validation  

**Project:** Carerity  

**Business Domain:** Healthcare Services Marketplace  

**Prepared by:** Wale Afilaka  

**Document Type:** Business Analysis — Discovery Findings  

**Evidence Status:** Preliminary observations and hypotheses pending validation

---

## 1. Executive Summary

Carerity is developing a digital marketplace that connects customers requiring personal support and home-care services with eligible caregivers.

A critical business capability is the platform's ability to identify, engage, and confirm suitable caregivers within an acceptable timeframe while maintaining safety, qualification, availability, and care requirements.

This discovery assessment examines potential sources of caregiver-matching delays, identifies operational and system constraints, and establishes an evidence-based approach for evaluating matching performance.

The objective is to identify opportunities to improve matching efficiency, customer experience, caregiver utilization, and operational scalability without compromising mandatory eligibility requirements.

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
5. Customer language preferences, where applicable



### 4.1 Mandatory Requirements

The following must not be bypassed:

- Required caregiver verification
- Mandatory care qualifications
- Safety and compliance requirements
- Actual caregiver availability
- Essential customer care requirements



### 4.2 Configurable Preferences

Non-mandatory preferences may be assessed for controlled flexibility, subject to customer consent and approved business rules.

Any flexibility must be clearly distinguished from mandatory eligibility requirements.

## 5. Operational Process Considerations

Carerity's matching workflow includes automated caregiver identification and outreach, caregiver expression of interest, customer selection, and confirmed assignment.

The current product design also incorporates:

- Ranked outreach to eligible caregivers
- Time-based outreach waves
- Customer review of interested caregivers
- Escalation of unresolved matching requests to Operations
- Assignment controls intended to prevent conflicting bookings

These design elements should be verified against the implemented application and documented separately as functional requirements and process flows.

### 5.1 Operational Questions

- At which stage does the greatest delay occur?
- How long does caregiver outreach take?
- How quickly do eligible caregivers express interest?
- How long do customers take to confirm a caregiver?
- What proportion of requests require manual intervention?
- How effective is manual matching?
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
- Mandatory versus preference-based exclusions

**Assessment Status:** All hypotheses remain open pending evidence-based evaluation.

## 7. Data Requirements & Measurement Framework

The investigation will assess whether Carerity's existing data model supports the following information requirements.

| Data Domain | Required Information | Business Purpose |

|---|---|---|

| Care Requests | Request ID, creation time, requested care period, care type | Measure demand |

| Caregivers | Caregiver ID, approval status, qualifications, capabilities | Assess eligible supply |

| Availability | Available dates, times, last update | Evaluate capacity |

| Geography | Service location, caregiver service radius | Assess geographic coverage |

| Matching | Search start, eligibility outcomes, outreach timestamps | Measure process performance |

| Interest | Caregiver interest timestamps | Measure caregiver response |

| Assignment | Customer confirmation and assignment timestamps | Measure completed matches |

| Operations | Escalations, manual actions, resolution outcomes | Assess intervention effectiveness |

### 7.1 Proposed Performance Measures

- Median and average time to confirmed assignment
- Percentage of requests confirmed within 30 minutes
- Percentage of requests unmatched after 60 minutes
- Eligible caregivers per active request
- Caregiver outreach response rate
- Customer confirmation rate
- Manual escalation rate
- Unfulfilled care request rate

Metric definitions, calculation logic, and reporting populations must be agreed before implementation.

## 8. Outstanding Discovery Questions

1. What constitutes a successful match: caregiver interest or customer-confirmed assignment?
2. What is the agreed definition of a delayed match?
3. What constitutes an unsuccessful or unfulfilled care request?
4. Which matching stages account for the greatest elapsed time?
5. How do caregiver availability and demand vary throughout the day?
6. Which mandatory requirements most frequently reduce the eligible pool?
7. How reliable and current are caregiver availability records?
8. How does matching performance differ across service areas?
9. How frequently are requests escalated to Operations?
10. What percentage of escalated requests result in successful assignments?
11. Which required timestamps and events are currently captured?
12. What performance objectives are operationally feasible and commercially meaningful?



## 9. Recommended Analysis Activities



### Activity 1 — Current-State Assessment

Review the existing Carerity application, matching workflow, business rules, and relevant technical documentation.

**Deliverable:** Current-State Process Assessment

### Activity 2 — Data Model Review

Identify existing database tables, primary keys, foreign keys, relevant fields, and matching event timestamps.

**Deliverable:** Data Inventory & Entity Relationship Assessment

### Activity 3 — Hypothesis Validation

Translate each root-cause hypothesis into measurable business questions and develop SQL queries to evaluate available data.

**Deliverable:** Hypothesis & Evidence Matrix

### Activity 4 — Requirements Analysis

Document validated business, stakeholder, functional, non-functional, and data requirements.

**Deliverable:** Requirements Specification & Traceability Matrix

### Activity 5 — Solution Assessment

Evaluate potential improvements against business objectives, technical feasibility, operational impact, and compliance requirements.

**Deliverable:** Options Assessment & Recommendations

### Activity 6 — Delivery & Validation

Translate approved changes into actionable backlog items, acceptance criteria, and test scenarios.

**Deliverables:** User Stories, Acceptance Criteria, UAT Evidence & Change Log

## 10. Risks, Assumptions & Dependencies



### Risks

- Incomplete event logging may prevent accurate performance measurement.
- Caregiver profile data may not reliably reflect real-time availability.
- Matching optimization could inadvertently weaken essential eligibility safeguards if requirements are not clearly separated.
- Insufficient operational data may limit the reliability of conclusions.



### Assumptions

- Matching events can be identified within the existing application or database.
- Caregiver eligibility rules can be reviewed and documented.
- Relevant stakeholders can clarify operational definitions and expected outcomes.



### Dependencies

- Access to the current application architecture and database schema
- Confirmation of existing matching business rules
- Availability of reliable data for analysis
- Business approval of proposed performance targets



## 11. Next Steps

1. Inspect the existing Carerity project architecture.
2. Identify relevant Supabase/PostgreSQL tables and relationships.
3. Map the current caregiver-matching process.
4. Establish measurable business questions for hypotheses H1–H5.
5. Develop SQL queries to assess available evidence.
6. Document validated findings and evidence gaps.
7. Recommend improvements based on verified analysis.

---

**Document Status:** Draft — Pending Evidence Validation  

**Version:** 0.1  

**Next Deliverable:** Current-State Data Model & Matching Process Assessment