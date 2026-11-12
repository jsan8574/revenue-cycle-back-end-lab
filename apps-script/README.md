# Log learner activity to Google Sheets

The Lab sends learner activity to a Google Sheet through an Apps Script web app.
The browser never talks to Google directly: it calls `/api/training-storage` on
the Lab's server, which adds a private key and forwards the request.

## 1. Set up the Apps Script (in Google)

1. Open the **RCM Lab Training Sessions** spreadsheet → **Extensions → Apps Script**.
2. Delete the sample code, paste all of **RCM_Lab_Storage.gs**, and save.
   (If you use a different spreadsheet, change `RCM_SHEET_ID` at the top to its ID.)
3. In the function dropdown, pick **setupSheets** → **Run**. Approve Google's
   permission prompt. This creates the tabs `Sessions`, `Case Progress`,
   `Research Log` and `Submissions` with their headers.
4. Pick **initializeStorage** → **Run**. This creates a random private key.
5. Open **Project Settings (gear) → Script Properties** and copy the value of
   **RCM_STORAGE_KEY**. Keep it private.
6. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**

   Copy the **Web app URL** (ends in `/exec`). "Anyone" only makes the endpoint
   reachable; the spreadsheet stays private and every request needs the key.

## 2. Connect the Lab (in Vercel)

1. Vercel → project **revenue-cycle-back-end-lab** → **Settings → Environment Variables**.
2. Add two variables (Production, Preview):
   - `RCM_STORAGE_URL` = the `/exec` URL
   - `RCM_STORAGE_KEY` = the key from step 1.5
3. **Deployments → ⋯ on the latest → Redeploy** so the variables take effect.

## 3. Test it

1. Open the live Lab. The sidebar box should say **Online saving connected**.
2. Start a learner session, open an Insurance Follow-up account, open the payer
   research hub and do a portal search or payer call.
3. Within a few seconds the sidebar shows **Saved online · time**, and rows
   appear in the Sheet.

## What gets logged

| Tab | One row per |
| --- | --- |
| Sessions | learner session: name, start time, last update |
| Case Progress | learner × account: latest saved work (JSON) |
| Research Log | payer portal, phone and chat interaction |
| Submissions | appeal / document packet submitted to the payer |

Coverage: Insurance Follow-up and Denial Management accounts. Resume codes are
stored only as hashes. The script has no delete operation.

## Updating the script later

After editing the code: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
The `/exec` URL stays the same.

## Troubleshooting

- Sidebar still says **Device saving available** → env vars missing or not redeployed.
- **Online saving did not complete** → check the Apps Script **Executions** log.
  `SCHEMA_MISMATCH` means a tab or header was renamed: run **setupSheets** again
  on a fresh tab, or fix the header row. `UNAUTHORIZED` means the key in Vercel
  doesn't match the Script Property.
