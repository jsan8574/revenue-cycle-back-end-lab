# Revenue Cycle Back End Lab

A responsive, fictional training simulator for:

- Payment Posting
- AR Collections / Insurance Follow-up
- Denial Management

The three independent workstations use realistic fictional records. Answers
remain hidden until the learner investigates the account, documents a rationale,
and commits a decision.

The Payment Posting workstation includes six realistic claim- and service-level
ERA/835 scenarios, bank evidence, account search with true no-match handling,
per-service-line payment and adjustment entry, partial and full denial handling,
patient-responsibility allocation, reversal/recoupment handling, batch
reconciliation, and an in-system glossary of posting terms.

The AR Collections / Insurance Follow-up workstation includes five accounts, a
ranked priority queue, a nine-step investigation checklist, realistic billing
history, prior-agent notes, PDF-style EOBs and correspondence, detailed
transactions, related accounts, insurance and authorization records,
credential-based payer portal claim research, a complete payer-call flow,
expected-reimbursement calculation, resolution routing, and structured
issue/findings/resolution notation.

Denial Management uses the same account-investigation workstation with five
neutral-title cases and a ranked denial queue. It adds denial evidence,
service-line adjudication, editable appeal-letter templates, attachment
checklists, electronic or mail submission requests, success confirmations,
resolution validation, and completion scoring.

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
  components/TrainingWorkspace.tsx     Main interactive training experience
  data/exploration.ts                  Posting, follow-up, and denial records
  data/training.ts                     Module definitions and reference data
  globals.css                          Responsive visual system
  layout.tsx                           Site metadata and social preview
  page.tsx                             Main entry page
public/
  og.png                            Social preview card
```

## Training-data safety

All included names, account identifiers, payer names, claim details, and amounts
are fictional. Do not enter real patient, payment, payer, or protected health
information into the simulator.
