# Carerity — Business Analysis Planning & Monitoring

**Knowledge Area:** Business Analysis Planning and Monitoring  
**Project:** Carerity Caregiver Marketplace  
**Status:** Initial baseline — subject to updates as the project progresses

## 1. Purpose

Establish how business analysis activities, requirements, documentation, changes and implementation evidence will be organized, maintained and tracked throughout Carerity's development.

The approach connects business requirements with the actual application code, database architecture and delivery activities.

## 2. Business Analysis Approach

Carerity uses an iterative approach combining business analysis practices with Agile/Scrum principles.

Business needs and stakeholder expectations are documented before implementation decisions are finalized. Existing application functionality is reviewed before changes are introduced.

The approach follows:

1. Identify business needs and objectives.
2. Elicit and document requirements.
3. Plan and monitor BA activities.
4. Review existing systems and identify gaps.
5. Analyze and validate requirements.
6. Prioritize implementation work.
7. Implement, test and review changes.
8. Maintain traceability and change history.

## 3. Stakeholders and Responsibilities


| Stakeholder                          | Responsibilities                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Product Owner / Business Founder     | Business objectives, prioritization and approval of business rules                    |
| Business Analyst                     | Requirements elicitation, analysis, documentation, traceability and change assessment |
| Developer / Technical Implementation | Application development, technical design and defect resolution                       |
| Customer / Family                    | Care requests, caregiver selection, booking and payment experience                    |
| Caregiver                            | Availability, service acceptance, care delivery and earnings                          |
| Administrator                        | Verification, pricing configuration, matching escalation and operational oversight    |
| Payment Provider                     | Payment processing and transaction reporting                                          |


These represent functional responsibilities; they do not necessarily imply separate individuals currently occupy each role.

## 4. Requirements and Documentation Management

GitHub is the version-controlled repository for Carerity's application source code and BA documentation.

**Repository:** [https://github.com/waleafilaka/carerity](https://github.com/waleafilaka/carerity)


| Document area                 | Purpose                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| Strategy Analysis             | Business problems, objectives and success measures              |
| Elicitation and Collaboration | Discovery findings, stakeholder needs and hypotheses            |
| BA Planning and Monitoring    | BA approach, repository organization and change tracking        |
| Current System Review         | Existing application and database evidence                      |
| Requirements Analysis         | Business rules, functional requirements and acceptance criteria |
| Scrum Backlog                 | Prioritized user stories, implementation tasks and dependencies |
| Testing and UAT               | Test cases, outcomes, defects and acceptance evidence           |


Documents should distinguish approved decisions, assumptions, open questions and verified implementation evidence.

## 5. Version Control and Change Tracking

The existing Carerity application and business analysis documentation are maintained in the same Git repository.

**Established configuration:**

- GitHub account: `waleafilaka`
- Repository: `carerity`
- Primary branch: `main`
- Remote: `origin`
- Development environment: Cursor
- Application technology: Next.js, TypeScript and Supabase

### Change Management Process

1. Identify and describe the proposed change.
2. Determine the affected business requirements and application components.
3. Assess customer, caregiver, operational, financial and technical impacts.
4. Confirm the decision and acceptance criteria.
5. Implement the approved change.
6. Test the affected functionality.
7. Commit the change with a descriptive message.
8. Push the update to GitHub.

Changes affecting confirmed bookings, caregiver compensation, payments or customer commitments require particular attention to data integrity and backward compatibility.

## 6. Requirements Traceability

Each significant requirement should be traceable through:

**Business Need → Requirement ID → User Story → Application Component → Test Case → Result**

Traceability will be established progressively as the current-state review and implementation work proceed.

The existence of code does not, by itself, demonstrate that a requirement has been fully implemented or tested.

## 7. Monitoring and Delivery Controls

Progress will be monitored through:

- Requirements status: proposed, approved, implemented or deferred.
- Implementation status: not started, in progress, completed or blocked.
- Test status: not run, passed, failed or blocked.
- Open risks, issues, assumptions and dependencies.
- Git commit history and documented changes.
- Acceptance criteria and validation evidence.

GitHub commits provide version history, but they do not independently prove business approval or successful testing.

## 8. Initial Project Baseline

The following activities have been completed:

- Created and configured the personal GitHub repository.
- Connected the existing Cursor application to GitHub.
- Published the existing application source code.
- Documented the caregiver-matching business need.
- Documented caregiver-matching discovery findings.
- Established pricing and booking requirements.
- Organized BA documentation into numbered knowledge-area folders.

The next planned activity is the **Current System & Database Review**, followed by requirements gap analysis and prioritized implementation planning.

## 9. Review and Maintenance

This document will be updated as the project evolves.

Significant changes to scope, business rules, requirements, implementation priorities or technical architecture should be reflected in the relevant documents and Git commit history.

