# Owner guide: numbers and moderation (nothing is shown on the website)

**Website visitors, page views, countries, devices:** Cloudflare dashboard, then *Analytics & Logs*, then *Web Analytics* (the site already sends visits there).

**Members, logins, downloads, paid books, Parents' corner:** your data lives in the Cloudflare D1 database `hog-accounts`.
- Cloudflare dashboard, then *Storage & Databases*, then *D1 SQL database*, then `hog-accounts`, then the *Console* tab. Paste any query from `queries.sql`.
- Or from this folder on your computer: `npm run owner -- stats --remote`

**Parents' corner moderation**
- See what members reported: `npm run owner -- reports --remote`
- Remove something: `npm run owner -- hide post 12 --remote` (or `reply`)
- Keep something and clear the report: `npm run owner -- dismiss post 12 --remote`
- You can also remove any post or reply directly in the Parents' corner while logged in as the admin account.

**Money:** the Stripe dashboard shows payments, refunds and payouts.
