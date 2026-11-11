-- Paid, personalized coloring books (Stripe Checkout)
CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product           TEXT NOT NULL,
  name              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  amount_cents      INTEGER NOT NULL,
  currency          TEXT NOT NULL,
  stripe_session_id TEXT,
  created_at        INTEGER NOT NULL,
  paid_at           INTEGER
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at);
