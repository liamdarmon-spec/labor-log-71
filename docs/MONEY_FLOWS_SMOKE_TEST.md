## Money Flows Smoke Tests (CI + Manual)

### Automated (Vitest)
These tests validate the billing UI state machine for the three required flows:
- Milestone schedule flow
- SOV progress billing flow
- Standalone invoice flow

Run:
```bash
npm install
npm test
```

Tests live in:
- `tests/moneyFlowsSmoke.test.ts`
- `tests/milestoneSchedule.test.ts`

### Manual UI Smoke (Real Environment)
1) Milestone Schedule flow
   - Proposal → Contract Type = Milestone Schedule
   - Add milestones, save, approve, initialize billing baseline
   - Billing tab primary CTA should be **Bill Milestone**

2) SOV Progress Billing flow
   - Proposal → Contract Type = Progress Billing (SOV)
   - Add SOV lines, save, approve, initialize billing baseline
   - Billing tab primary CTA should be **New Pay App**

3) Standalone Invoice flow (no baseline)
   - Billing tab with no accepted proposal
   - Primary CTA should be **View Proposals**
   - Secondary CTA should be **Create Standalone Invoice**
   - Standalone invoice must not reduce **Remaining to Bill** (contract basis)


