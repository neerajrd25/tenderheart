# CEO Log — Baby's Day Out

Append-only record of business decisions, pilot facts and open questions. Newest entry last.

## 2026-10-13 — Starting position

**Facts**
- Pilot client: one daycare in Pune, 8 children, 2 staff.
- Product was built at no cost; no revenue yet.
- Parent reports go by email today.

**Decisions**
- Run a free 4-week pilot with this one centre before building anything substantial.
- Stay on email for the pilot. Move to WhatsApp only if there is a credible chance of revenue;
  the first step would be a no-cost "Share on WhatsApp" button, not the Business API.
- If no gap for a local player appears, discard the project or leave it on free tiers.
- Review against the decision gates in `.claude/skills/babysdayout-ceo/SKILL.md` at the end of
  pilot week 4.

**Initial ratings (out of 10)**
- Idea 6, MVP viability 6, technical scaling 7, business scaling 3, trajectory 5, income 4,
  competitive position 3.

**To do before the pilot starts**
- [ ] The two staff share one Google login (the app has no multi-staff centre yet).
- [ ] Fix "Activities today" not being saved.
- [ ] Fix Absent children not being closable.
- [ ] Rotate the database password that is in git history.
- [ ] Publish the Google sign-in consent screen or add the client's account as a test user.
- [ ] Fix `frontend/.env` API address (points at port 3000; backend runs on 4000).

**Open questions**
- Pilot start date?
- Do the parents at this centre read email at all, or only WhatsApp?
- How does the centre report to parents today (paper, WhatsApp group, nothing)?
- How many daycares of what size are within reach in Pune for in-person sales?

## 2026-10-13 — Pilot dated, pre-pilot fixes, 7pm auto-send idea

**Facts**
- Pilot starts 1 November 2026. Week-4 review falls on about 29 November 2026.
- The centre reports to parents on paper today, so the app replaces paper, not a WhatsApp habit.
- Neeraj's original core idea for email: reports go out automatically at 7pm, without staff
  pressing send. This is not built; sending is manual today.

**Done in code (not yet committed or deployed)**
- "Activities today" is now saved and appears in the parent email.
- A child marked Absent can be closed out; the parent gets a short absence notice.
- The send checklist on screen now matches the server's rules (all three meals; "None" is a
  valid bowel entry and no longer blocks sending).
- Pressing send now saves what is on screen first, so unsaved edits are not lost from the email.
- Local `frontend/.env` now points at the backend on port 4000.

**Still to do before 1 November (owner: Neeraj)**
- [ ] Rotate the database password that is in git history.
- [ ] Publish the Google sign-in consent screen or add the centre's account as a test user.
- [ ] Create the one shared Google login for the two staff.
- [ ] Deploy backend and frontend; send a test report to a real inbox.

**CEO view on 7pm auto-send (awaiting decision)**
- Worth building as a safety net: manual send stays, and at 7pm IST any complete, unsent report
  goes out automatically. Incomplete ones stay flagged rather than being sent half-empty.
- It removes the most likely pilot failure (staff forget to press send).
- Consequence for WhatsApp: automatic sending is only possible through the paid Business API,
  not the free share button. If auto-send is core, WhatsApp means API cost and approval, which
  reinforces "WhatsApp only with revenue".
- If built, the week-4 usage gate should read "80%+ of attended child-days have a complete
  report by 7pm" instead of "staff sent reports".

## 2026-10-13 — 7pm auto-send built

**Decision**
- Build the 7pm auto-send as a safety net (Neeraj's call). Manual send stays.

**Done in code (not yet committed or deployed)**
- A daily EventBridge Scheduler rule at 19:00 Asia/Kolkata emails every complete, unsent report
  for the day, retries failed sends, and leaves incomplete reports for staff. It is created by
  the normal backend deploy.
- Times in parent emails now show in India time; previously the deployed server would have
  shown them in UTC (5.5 hours early).

**Changed assumption**
- Week-4 usage gate now reads: 80%+ of attended child-days have a complete report by 7pm.

**To verify after the first deploy**
- [ ] The schedule exists and fires at 7pm IST; check the Lambda log for "Auto-send summary".
- [ ] A real parent inbox shows correct India times.

## 2026-10-13 — Renamed TenderHeart, redesigned, hosting prepared

**Decisions**
- Product name: **TenderHeart by NexusChain Consulting**. Address: `https://tenderheart.nexuschainconsulting.com`.
- Hosting: private S3 + CloudFront + free AWS certificate. Plain S3 website hosting was ruled out
  because it is HTTP-only on a custom domain, which blocks app install and Google Sign-In.
- Look: warm coral and cream with plum text; mobile-first.
- Internal AWS names keep the old `baby-day-out` prefix so the live backend is not rebuilt.

**Done in code (not yet committed or deployed)**
- Full rebrand of app, icons, install name and parent email.
- Mobile-first redesign: one-tap chips for meals and bowel habits, Present/Absent toggle,
  bottom-sheet dialogs, next-step label on each child card, in-app install card.
- Frontend deploy now sets up the certificate and custom domain and prints the GoDaddy records.

**To do before 1 November (owner: Neeraj)**
- [ ] `npm run deploy` in `backend/`, then in `frontend/`; add the two CNAME records in GoDaddy.
- [ ] Add the new address to the Google OAuth client; publish the consent screen.
- [ ] Rotate the database password that is in git history.
- [ ] Install on one Android phone and one iPhone; send a test report to a real inbox.
