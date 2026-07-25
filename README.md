# Revenue Cycle Lab

A responsive, fictional training simulator for:

- Patient Collections
- Payment Posting
- AR Collections
- Denial Management

Each module includes three realistic practice scenarios, guided workflow steps,
trainer prompts, a live scorecard, history, notes, and completion logs.

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
  components/TrainingWorkspace.tsx  Main interactive training experience
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
