# Strategy Analysis — Caregiver Matching Business Need & Goals

**Document ID:** CAR-STR-001  

**Version:** 0.1  

**Status:** Draft — Pending Validation  

**Project:** Carerity  

**Prepared by:** Wale Afilaka  

**Document Type:** Business Need & Objectives

---

## 1. Business Context

Carerity is developing a digital marketplace that connects customers requiring personal support and home-care services with qualified caregivers.

The platform supports customers searching for care, caregivers offering services, and administrators overseeing operational activities.

A key business requirement is the ability to match customers with suitable caregivers efficiently while maintaining appropriate safety, availability, qualification, and care requirements.

## 2. Business Problem

Finding a suitable caregiver can involve delays due to several possible factors, including:

- Limited caregiver availability during certain periods
- Differences in caregiver supply across service areas
- Specialized customer care requirements
- Incomplete or outdated caregiver information
- Time required for caregiver responses and customer confirmation

These factors are potential causes and have not yet been confirmed through system data.

**Problem Statement:**

Carerity needs a reliable and efficient caregiver-matching process that reduces unnecessary delays while ensuring customers are connected only with eligible caregivers who can meet their care requirements.

## 3. Business Need

The business needs a matching capability that:

1. Identifies caregivers who meet mandatory eligibility and care requirements.
2. Connects care requests with suitable caregivers within a reasonable timeframe.
3. Provides customers with a clear process for reviewing and confirming caregivers.
4. Supports timely intervention when automated matching is unsuccessful.
5. Maintains accurate matching records for operational monitoring and improvement.
6. Supports growth in care requests without unnecessary increases in manual workload.



## 4. Business Goals

| Goal | Intended Outcome |

|---|---|

| Improve matching speed | Reduce unnecessary waiting time for customers |

| Improve matching success | Increase the proportion of care requests resulting in confirmed assignments |

| Maintain care suitability | Ensure mandatory qualifications and care requirements are satisfied |

| Improve operational efficiency | Reduce avoidable manual intervention |

| Improve customer experience | Provide clear matching progress and confirmation |

| Support scalability | Enable matching across growing customer and caregiver populations |

## 5. Preliminary Performance Objectives

The following are proposed measures for evaluating matching performance. Baselines and targets require validation.

| Measure | Proposed Objective |

|---|---|

| Matching speed | Assess feasibility of confirming 80% of ordinary care requests within 30 minutes |

| Matching success | Increase the percentage of requests resulting in confirmed assignments |

| Unmatched requests | Reduce requests remaining unmatched after the defined matching period |

| Operational intervention | Monitor and reduce avoidable manual matching workload |

| Care suitability | Maintain compliance with mandatory eligibility and care requirements |

The proposed 80%-within-30-minutes objective is not an approved or verified performance target.

## 6. Scope of Analysis



### In Scope

- Current caregiver-matching workflow
- Caregiver eligibility and availability
- Geographic matching constraints
- Care capability requirements
- Caregiver outreach and response
- Customer selection and confirmation
- Administrative escalation
- Matching performance and data availability



### Out of Scope for This Assessment

- Payment processing and caregiver payouts
- Caregiver payroll arrangements
- General marketing and customer acquisition
- Unrelated customer dashboard functionality
- Clinical treatment decisions

These areas may be reviewed separately if dependencies arise.

## 7. Key Stakeholders

| Stakeholder | Interest or Responsibility |

|---|---|

| Product Owner / Business Management | Business objectives, priorities and product direction |

| Customers / Families | Timely access to suitable caregivers |

| Caregivers | Relevant opportunities and manageable availability |

| Operations / Administrators | Monitoring requests and resolving unsuccessful matches |

| Development Team | Technical implementation and system reliability |

| Compliance / Verification Function | Mandatory eligibility and safety requirements |

Stakeholder responsibilities and decision authority require confirmation.

## 8. Business Constraints

The matching process must:

- Preserve mandatory caregiver verification requirements.
- Respect caregiver availability and service coverage.
- Meet essential customer care requirements.
- Prevent conflicting confirmed assignments.
- Support appropriate customer confirmation.
- Maintain reliable records of matching decisions and outcomes.

Improving speed must not compromise care suitability or safety.

## 9. Assumptions & Risks



### Assumptions

- Sufficient caregiver and request data can be obtained for analysis.
- Matching activities can be measured using system events or operational records.
- Business stakeholders can confirm the proposed performance objectives.



### Risks

- Insufficient caregiver supply may limit improvements achievable through software changes alone.
- Incomplete data may prevent reliable identification of root causes.
- Increasing outreach without adequate controls may create operational or customer-experience issues.
- Performance targets may be unrealistic without considering request complexity and service-area differences.



## 10. Success Criteria & Next Steps

Success will be assessed using agreed definitions and validated measures of:

- Time to confirmed caregiver assignment
- Matching success rate
- Unmatched and escalated requests
- Caregiver eligibility compliance
- Customer confirmation outcomes
- Operational workload



### Next Steps

1. Conduct stakeholder discovery and clarify matching challenges.
2. Document observations, assumptions and potential causes.
3. Identify data required to evaluate the problem.
4. Review the current matching workflow and database.
5. Validate findings before recommending changes.

**Next Document:** CAR-DISC-001 — Caregiver Matching Discovery & Problem Analysis.

---

**Document Status:** Draft — Pending Validation  

**Version:** 0.1