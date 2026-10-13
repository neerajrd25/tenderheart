# TODO

Tracking remaining manual configuration and possible follow-up enhancements for TenderHeart.
See the end of the project chat / PR description for the full delivery summary.

## Required before first real use

- [ ] Create a Google OAuth 2.0 Web client ID and put it in `backend/.env` (`GOOGLE_CLIENT_ID`)
      and `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`).
- [ ] Create a MongoDB Atlas cluster + database user and put the connection string in
      `backend/.env` (`DB_URL`, `DB_NAME`).
- [ ] Get SMTP credentials for `info@nexuschainconsulting.com` and put them in `backend/.env`
      (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`).
- [ ] `aws configure` with real credentials and confirm the target account/region.
- [ ] Deploy backend (`cd backend && npm run deploy`), then set `VITE_API_URL` in
      `frontend/.env`, then deploy frontend (`cd frontend && npm run deploy`).
- [ ] Add the two CNAME records printed by the frontend deploy in GoDaddy DNS.
- [ ] Add `https://tenderheart.nexuschainconsulting.com` as an Authorized JavaScript origin on the
      Google OAuth client.
- [ ] Add at least one real child via the dashboard's **+ Add Child** button (parent name/email,
      date of birth, gender, optional photo URL) so staff have something to report on.

## Possible future enhancements (not required by the current spec)

- [ ] Soft-delete / archive UI for children (`active: false`) beyond the API already supporting it.
- [ ] Photo upload (S3 presigned URL) instead of a plain photo URL field.
- [ ] Admin view across multiple staff/users if multi-user daycare rooms are needed later.
- [ ] Push notifications to parents in addition to email.
