-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

----------------------------------------
-- FRAUD DETECTIONS
----------------------------------------
CREATE TABLE IF NOT EXISTS fraud_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,

  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  risk_level VARCHAR(50) NOT NULL DEFAULT 'low',

  indicators JSONB NOT NULL DEFAULT '{}',

  payment_method VARCHAR(100),
  card_token VARCHAR(255),
  card_last4 VARCHAR(4),
  card_country VARCHAR(2),

  user_ip_address INET,
  device_fingerprint VARCHAR(255),

  previous_fraud_count INT DEFAULT 0,

  review_status VARCHAR(50) DEFAULT 'pending',
  reviewer_id UUID,
  review_notes TEXT,
  reviewed_at TIMESTAMP,

  false_positive BOOLEAN,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

----------------------------------------
-- USER ACTIVITY VELOCITY
----------------------------------------
CREATE TABLE IF NOT EXISTS user_activity_velocity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  activity_type VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL,

  metadata JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

----------------------------------------
-- RETURNS
----------------------------------------
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id UUID NOT NULL,
  order_item_id UUID NOT NULL,
  user_id UUID NOT NULL,
  seller_id UUID NOT NULL,

  quantity INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  description TEXT,

  status VARCHAR(50) DEFAULT 'requested',

  refund_amount DECIMAL(10,2),
  refund_status VARCHAR(50) DEFAULT 'pending',
  refund_initiated_at TIMESTAMP,

  tracking_number VARCHAR(255),
  tracking_carrier VARCHAR(100),

  returned_condition VARCHAR(100),

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

----------------------------------------
-- LOYALTY LEDGER
----------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL,
  points INT NOT NULL,

  transaction_type VARCHAR(100) NOT NULL,
  reference_id UUID,

  description TEXT,
  expires_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

----------------------------------------
-- RECOMMENDATION EVENTS
----------------------------------------
CREATE TABLE IF NOT EXISTS recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL,
  product_id UUID NOT NULL,

  event_type VARCHAR(100) NOT NULL,

  score DECIMAL(5,3),
  conversion BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

----------------------------------------
-- INDEXES (IMPORTANT FOR 200K USERS)
----------------------------------------

-- Fraud
CREATE INDEX idx_fraud_order_id ON fraud_detections(order_id);
CREATE INDEX idx_fraud_user_id ON fraud_detections(user_id);
CREATE INDEX idx_fraud_risk_level ON fraud_detections(risk_level);
CREATE INDEX idx_fraud_review_status ON fraud_detections(review_status);
CREATE INDEX idx_fraud_created_at ON fraud_detections(created_at);
CREATE INDEX idx_fraud_user_risk ON fraud_detections(user_id, risk_level);

-- Activity
CREATE INDEX idx_user_activity ON user_activity_velocity(user_id, activity_type, timestamp);

-- Returns
CREATE INDEX idx_returns_user_id ON returns(user_id);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_order_id ON returns(order_id);
CREATE INDEX idx_returns_created_at ON returns(created_at);
CREATE INDEX idx_returns_refund_status ON returns(refund_status);

-- Loyalty
CREATE INDEX idx_loyalty_user_id ON loyalty_ledger(user_id);
CREATE INDEX idx_loyalty_transaction_type ON loyalty_ledger(transaction_type);
CREATE INDEX idx_loyalty_expires ON loyalty_ledger(expires_at);

-- Recommendation
CREATE INDEX idx_recommendation_user_product ON recommendation_events(user_id, product_id);
CREATE INDEX idx_recommendation_event_type ON recommendation_events(event_type);
CREATE INDEX idx_recommendation_user_time ON recommendation_events(user_id, created_at);