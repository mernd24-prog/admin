-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

----------------------------------------
-- SELLER COMMISSIONS
----------------------------------------
CREATE TABLE IF NOT EXISTS seller_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  seller_id UUID NOT NULL,
  order_id UUID NOT NULL,
  order_item_id UUID NOT NULL,

  product_price NUMERIC(12,2) NOT NULL,

  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 15 CHECK (commission_rate >= 0),
  commission_amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) NOT NULL,
  net_commission NUMERIC(12,2) NOT NULL,

  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid')),

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

----------------------------------------
-- SELLER PAYOUTS
----------------------------------------
CREATE TABLE IF NOT EXISTS seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  seller_id UUID NOT NULL,

  payout_period_start DATE NOT NULL,
  payout_period_end DATE NOT NULL,

  total_commissions NUMERIC(14,2) NOT NULL,
  total_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payout NUMERIC(14,2) NOT NULL,

  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','processing','completed','failed')),

  payment_method VARCHAR(100),
  payment_date TIMESTAMP,
  transaction_reference VARCHAR(255),

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

----------------------------------------
-- SELLER SETTLEMENTS
----------------------------------------
CREATE TABLE IF NOT EXISTS seller_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  seller_id UUID NOT NULL,

  settlement_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,

  commission_commissions NUMERIC(14,2) DEFAULT 0,
  commission_adjustments NUMERIC(14,2) DEFAULT 0,
  chargebacks NUMERIC(12,2) DEFAULT 0,
  platform_fees NUMERIC(12,2) DEFAULT 0,

  net_amount NUMERIC(14,2) NOT NULL,

  currency VARCHAR(3) DEFAULT 'USD',

  settlement_status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (settlement_status IN ('pending','issued','completed','contested')),

  bank_name VARCHAR(255),
  bank_account_last4 VARCHAR(4),

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

----------------------------------------
-- INDEXES (VERY IMPORTANT FOR SCALE)
----------------------------------------

-- Seller commissions
CREATE INDEX idx_commissions_seller_id ON seller_commissions(seller_id);
CREATE INDEX idx_commissions_status ON seller_commissions(status);
CREATE INDEX idx_commissions_created_at ON seller_commissions(created_at);
CREATE INDEX idx_commissions_seller_status ON seller_commissions(seller_id, status);

-- Seller payouts
CREATE INDEX idx_payouts_seller_id ON seller_payouts(seller_id);
CREATE INDEX idx_payouts_status ON seller_payouts(status);
CREATE INDEX idx_payouts_period ON seller_payouts(payout_period_start, payout_period_end);
CREATE INDEX idx_payouts_seller_status ON seller_payouts(seller_id, status);

-- Seller settlements
CREATE INDEX idx_settlements_seller_id ON seller_settlements(seller_id);
CREATE INDEX idx_settlements_date ON seller_settlements(settlement_date);
CREATE INDEX idx_settlements_status ON seller_settlements(settlement_status);
CREATE INDEX idx_settlements_seller_date ON seller_settlements(seller_id, settlement_date);