# Revenue Cycle Lab

A responsive, fictional training simulator for:

- Payment Posting
- AR Collections
- Denial Management

Each module includes three realistic practice scenarios. Denial Management uses
a guided learner workflow; Payment Posting and AR Collections use independent
system workstations where answers are validated only after the learner submits
a decision.

The Payment Posting workstation includes six realistic claim- and service-level
ERA/835 scenarios, bank evidence, account search with true no-match handling,
per-service-line payment and adjustment entry, partial and full denial handling,
patient-responsibility allocation, reversal/recoupment handling, batch
reconciliation, and an in-system glossary of posting terms.

The AR Collections workstation includes five cases, a nine-step investigation
checklist, prior account notes, PDF-style EOBs and correspondence, transactions,
related accounts, insurance and authorization records, credential-based payer
portal claim research, a complete payer-call flow, expected-reimbursement
calculation, resolution routing, and structured issue/findings/resolution
notation.

Denial Management includes five complexity-labeled cases with neutral case
titles, PDF-style claim determinations, service-line EOB detail, investigation
workflows, trainer prompts, and completion scoring.

Every learner session begins with name capture. Each of the three modules
offers three printable PDF reports containing the learner name and current
work.

## Run locally

Requirements:

- Node.js 22.13 or newer
- npm

From this project folder:

```bash
npm install
npm run dev
```

Open the local address printed in the terminal (normally
`http://localhost:3000`).

## Build for production

```bash
npm run build
```

## Project structure

```text
app/
  components/ARCollectionsLab.tsx      AR investigation system
  components/PaymentPostingLab.tsx     Payment posting system
  components/TrainingWorkspace.tsx  Main interactive training experience
  data/exploration.ts                Posting and AR simulation records
  data/training.ts                  Fictional modules and scenarios
  globals.css                       Responsive visual system
  layout.tsx                        Site metadata and social preview
  page.tsx                          Main entry page
public/
  og.png                            Social preview card
```

## Training-data safety

All included names, account identifiers, payer names, claim details, and amounts
are fictional. Do not enter real patient, payment, payer, or protected health
information into the simulator.
