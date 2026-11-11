-- Paste any of these into Cloudflare dashboard > D1 > hog-accounts > Console.
-- Times are stored in milliseconds; date(x/1000,'unixepoch') makes them readable.

-- Members: total, new in 7 days, new in 30 days
SELECT COUNT(*) AS total,
       SUM(created_at > (strftime('%s','now') - 7*86400)*1000)  AS last_7_days,
       SUM(created_at > (strftime('%s','now') - 30*86400)*1000) AS last_30_days
FROM users WHERE is_admin = 0;

-- Sign-ups, logins and return visits per day (last 30 days)
SELECT date(created_at/1000,'unixepoch') AS day, type, COUNT(*) AS n
FROM events WHERE created_at > (strftime('%s','now') - 30*86400)*1000
GROUP BY day, type ORDER BY day DESC;

-- Where members are from
SELECT country, COUNT(*) AS members FROM users WHERE is_admin = 0 GROUP BY country ORDER BY members DESC;

-- Downloads by kind
SELECT kind, COUNT(*) AS downloads FROM downloads GROUP BY kind ORDER BY downloads DESC;

-- Paid personalized coloring books
SELECT COUNT(*) AS paid_books, COALESCE(SUM(amount_cents),0)/100.0 AS revenue
FROM orders WHERE status = 'paid';

-- Parents' corner: newest discussions
SELECT id, category, title, datetime(created_at/1000,'unixepoch') AS posted FROM posts WHERE hidden = 0 ORDER BY id DESC LIMIT 20;

-- Parents' corner: open reports
SELECT kind, target_id, COUNT(*) AS reports FROM reports WHERE handled = 0 GROUP BY kind, target_id;
