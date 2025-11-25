-- ============================================================================
-- ADD RLS POLICIES FOR VENDOR PAYMENTS TABLES
-- ============================================================================

-- Enable RLS on vendor_payments
ALTER TABLE vendor_payments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on vendor_payment_items
ALTER TABLE vendor_payment_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for vendor_payments (allow all for now, same pattern as other tables)
CREATE POLICY "Anyone can view vendor payments"
  ON vendor_payments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert vendor payments"
  ON vendor_payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update vendor payments"
  ON vendor_payments FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete vendor payments"
  ON vendor_payments FOR DELETE
  USING (true);

-- RLS policies for vendor_payment_items (allow all for now, same pattern as other tables)
CREATE POLICY "Anyone can view vendor payment items"
  ON vendor_payment_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert vendor payment items"
  ON vendor_payment_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update vendor payment items"
  ON vendor_payment_items FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete vendor payment items"
  ON vendor_payment_items FOR DELETE
  USING (true);