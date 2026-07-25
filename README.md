# Revenue Cycle Lab

A responsive, fictional training simulator for:

- Payment Posting
- AR Collections
- Denial Management

Each module includes three realistic practice scenarios. Denial Management uses
a guided learner workflow; Payment Posting and AR Collections use independent
system workstations where answers are validated only after the learner submits
a decision.

The Payment Posting workstation includes realistic claim- and service-level
ERA/835 records, bank evidence, account search with true no-match handling,
encounter matching, line-level posting, reversal/recoupment handling,
patient-responsibility allocation, batch reconciliation, and an in-system
glossary of payment-posting terms.

The AR Collections workstation includes a nine-step investigation checklist,
account balance and history, EOBs and correspondence, prior transactions,
related accounts, insurance and authorization records, payer portal and payer
call simulations, expected-reimbursement calculation, resolution routing, and
structured issue/findings/resolution notation.

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
