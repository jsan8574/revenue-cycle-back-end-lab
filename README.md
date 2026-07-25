# Revenue Cycle Lab

A responsive, fictional training simulator for:

- Patient Collections
- Payment Posting
- AR Collections
- Denial Management

Each module includes three realistic practice scenarios. Patient Collections
and Denial Management use guided learner workflows; Payment Posting and AR
Collections use independent system workstations where answers are validated
only after the learner submits a decision.

The Payment Posting workstation includes source ERA/835 records, bank evidence,
patient search, encounter matching, line-level posting, denial/reversal
handling, patient-responsibility allocation, and batch reconciliation.

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
