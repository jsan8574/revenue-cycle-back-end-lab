# GitHub and deployment guide

This folder is the portable source copy of the Revenue Cycle Back End Lab.
GitHub stores and tracks the files. Vercel runs the website and can publish
every future GitHub update automatically.

## 1. Create an empty GitHub repository

1. Sign in at https://github.com.
2. Select **New repository**.
3. Enter `revenue-cycle-back-end-lab` as the repository name.
4. Choose **Private** initially. The deployed learner website can still be
   public even when its source repository is private.
5. Do not add a README, `.gitignore`, or license; they already exist here.
6. Select **Create repository**.

## 2. Connect this prepared folder

GitHub will display the repository address. In Terminal, open this project
folder and run the following, replacing `YOUR-GITHUB-USERNAME`:

```bash
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/revenue-cycle-back-end-lab.git
git push -u origin main
```

If GitHub requests authentication, sign in through the browser prompt or use
GitHub Desktop to publish the existing local repository.

## 3. Deploy from GitHub with Vercel

1. Sign in at https://vercel.com using GitHub.
2. Select **Add New → Project**.
3. Import `revenue-cycle-back-end-lab`.
4. Keep **Framework Preset: Next.js**.
5. Keep the default build command (`npm run build`) and output settings.
6. Select **Deploy**.
7. Test the temporary `vercel.app` URL before changing the learner domain.

## 4. Test before moving the custom domain

At minimum, verify:

- learner-name entry and navigation;
- Billing, Payment Posting, Insurance Follow-up, and Denial Management;
- prioritization, searches, payer simulation, notes, and scoring;
- blank and accomplished claim-form downloads;
- facilitator PDF/work-output downloads;
- save, refresh, and resume behavior in the same browser;
- desktop and mobile layouts.

## 5. Move the existing custom domain

Only after the Vercel test URL passes:

1. In the Vercel project, open **Settings → Domains**.
2. Add `rcmbackendlab.revexpertone.com`.
3. Vercel will show the DNS record it requires.
4. In Cloudflare DNS, replace only the existing record for the
   `rcmbackendlab` subdomain with the record Vercel provides.
5. Do not change other `revexpertone.com` records.
6. Wait for Vercel to show the domain as valid, then open the learner URL in a
   private/incognito browser window.

Keeping the same custom hostname gives returning learners the best chance of
retaining browser-local progress. A new hostname has separate browser storage.

## Future updates

After editing and testing the project:

```bash
git add .
git commit -m "Describe the update"
git push
```

Vercel will build and publish the pushed version automatically. Review the
deployment result before announcing changes to learners.

## Rollback

Vercel keeps prior successful deployments. If an update causes a problem, open
the project's **Deployments** page and promote the last known-good deployment.

