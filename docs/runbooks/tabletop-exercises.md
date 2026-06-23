---
title: Tabletop Exercises
owner: @tech-lead
team: all
last-reviewed: 2026-06-23
review-frequency: quarterly
status: active
tags: [general]
---
# Tabletop Exercises

## Overview
Tabletop exercises are discussion-based sessions where team members walk through incident scenarios to validate runbooks, identify gaps, and improve response procedures.

## Exercise Schedule

### Quarterly Schedule
- **Q1**: Security Incident
- **Q2**: Payment Outage
- **Q3**: Deployment Failure
- **Q4**: Infrastructure Outage

### Annual Schedule
- **Full-Scale Exercise**: All scenarios combined
- **New Scenario**: Based on recent incidents or emerging threats

## Exercise Structure

### Pre-Exercise Preparation
1. **Scenario Selection**
   - Choose scenario based on quarterly schedule
   - Customize scenario for current environment
   - Identify specific objectives

2. **Participant Selection**
   - Incident Commander
   - Relevant technical leads
   - Stakeholders
   - Observers (optional)

3. **Materials Preparation**
   - Runbooks
   - Communication templates
   - Escalation matrix
   - System diagrams
   - Contact lists

4. **Logistics**
   - Schedule date and time
   - Reserve conference room
   - Set up collaboration tools
   - Send calendar invites

### Exercise Execution

#### Phase 1: Introduction (15 minutes)
- Welcome and objectives
- Scenario overview
- Roles and responsibilities
- Ground rules

#### Phase 2: Scenario Walkthrough (60 minutes)
- **T+0**: Incident detection
- **T+15**: Initial assessment
- **T+30**: Containment
- **T+60**: Diagnosis
- **T+90**: Resolution
- **T+120**: Recovery
- **T+180**: Post-incident

#### Phase 3: Discussion (30 minutes)
- What went well
- What could be improved
- Gaps in runbooks
- Missing tools or resources
- Communication issues

#### Phase 4: Action Items (15 minutes)
- Identify improvements
- Assign owners
- Set deadlines
- Schedule follow-up

### Post-Exercise Activities
1. **Documentation**
   - Exercise summary
   - Findings and recommendations
   - Action items
   - Lessons learned

2. **Runbook Updates**
   - Update based on findings
   - Add missing procedures
   - Improve clarity
   - Add new scenarios

3. **Training**
   - Train on updated procedures
   - Share lessons learned
   - Update onboarding materials
   - Conduct follow-up training

## Exercise Scenarios

### Scenario 1: Security Incident

**Scenario**: A security alert indicates potential unauthorized access to the production database containing customer PII.

**Objectives**:
- Validate security incident runbook
- Test incident response team coordination
- Verify communication procedures
- Identify gaps in security controls

**Discussion Points**:
- How quickly is the incident detected?
- Who is notified and when?
- How is containment achieved?
- What evidence is preserved?
- How are customers notified?
- What is the recovery process?

**Success Criteria**:
- Incident detected within 15 minutes
- All stakeholders notified within 30 minutes
- Containment achieved within 1 hour
- Root cause identified within 4 hours
- Recovery completed within 24 hours

### Scenario 2: Payment Outage

**Scenario**: M-Pesa API is experiencing intermittent failures, causing 50% of payment transactions to fail during peak hours.

**Objectives**:
- Validate payment outage runbook
- Test payment operations coordination
- Verify customer communication procedures
- Identify gaps in payment system resilience

**Discussion Points**:
- How is the outage detected?
- What is the impact on customers?
- How are transactions handled?
- How is M-Pesa support contacted?
- What is the fallback strategy?
- How are refunds processed?

**Success Criteria**:
- Outage detected within 5 minutes
- Customer notification within 15 minutes
- Fallback strategy activated within 30 minutes
- Transaction backlog processed within 2 hours
- Full recovery within 4 hours

### Scenario 3: Deployment Failure

**Scenario**: A deployment to production fails due to a database migration error, causing the application to become unavailable.

**Objectives**:
- Validate deployment failure runbook
- Test rollback procedures
- Verify communication procedures
- Identify gaps in deployment process

**Discussion Points**:
- How is the failure detected?
- What is the rollback process?
- How is the database migration handled?
- How are customers notified?
- What is the hotfix process?
- How is the deployment improved?

**Success Criteria**:
- Failure detected within 5 minutes
- Rollback initiated within 15 minutes
- Rollback completed within 30 minutes
- Hotfix deployed within 4 hours
- Full recovery within 6 hours

### Scenario 4: Infrastructure Outage

**Scenario**: The MongoDB Atlas cluster experiences a primary node failure, causing database connectivity issues and application downtime.

**Objectives**:
- Validate infrastructure outage runbook
- Test infrastructure team coordination
- Verify failover procedures
- Identify gaps in infrastructure resilience

**Discussion Points**:
- How is the outage detected?
- What is the failover process?
- How is data integrity validated?
- How are customers notified?
- What is the recovery process?
- How is redundancy improved?

**Success Criteria**:
- Outage detected within 5 minutes
- Failover initiated within 10 minutes
- Failover completed within 30 minutes
- Data integrity validated within 1 hour
- Full recovery within 2 hours

## Exercise Evaluation

### Evaluation Criteria

**Runbook Quality**
- Completeness
- Clarity
- Accuracy
- Relevance

**Team Performance**
- Communication
- Coordination
- Decision-making
- Execution

**Process Effectiveness**
- Detection time
- Response time
- Resolution time
- Recovery time

**Tooling and Resources**
- Adequacy of tools
- Accessibility of resources
- Effectiveness of monitoring
- Quality of documentation

### Scoring

| Criteria | Score (1-5) | Weight | Weighted Score |
|----------|-------------|--------|----------------|
| Runbook Quality | | 0.3 | |
| Team Performance | | 0.3 | |
| Process Effectiveness | | 0.2 | |
| Tooling and Resources | | 0.2 | |
| **Total** | | **1.0** | |

**Grade**:
- 4.5-5.0: Excellent
- 4.0-4.4: Good
- 3.5-3.9: Satisfactory
- 3.0-3.4: Needs Improvement
- <3.0: Unsatisfactory

## Action Item Tracking

### Template

| ID | Description | Owner | Priority | Due Date | Status |
|----|-------------|-------|----------|----------|--------|
| 1 | Update runbook section X | John Doe | High | 2024-01-15 | In Progress |
| 2 | Add monitoring alert Y | Jane Smith | Medium | 2024-01-30 | Pending |
| 3 | Conduct training on Z | Bob Johnson | Low | 2024-02-15 | Pending |

### Follow-Up

- Weekly status updates
- Monthly review meeting
- Quarterly validation
- Annual assessment

## Lessons Learned

### Documentation Template

**Exercise**: [Exercise Name]
**Date**: [Date]
**Participants**: [List]

**What Went Well**
- [Positive outcome 1]
- [Positive outcome 2]
- [Positive outcome 3]

**What Could Be Improved**
- [Improvement area 1]
- [Improvement area 2]
- [Improvement area 3]

**Gaps Identified**
- [Gap 1]
- [Gap 2]
- [Gap 3]

**Action Items**
- [Action item 1]
- [Action item 2]
- [Action item 3]

**Next Exercise**
- [Date]
- [Scenario]
- [Objectives]

## References

- [NIST Incident Response Testing](https://csrc.nist.gov/publications/detail/sp-800-84/final)
- [Tabletop Exercise Best Practices](https://www.cisa.gov/tabletop-exercises-package)
- [Incident Response Exercises](https://www.sans.org/white-papers/leader/incident-response-testing)
