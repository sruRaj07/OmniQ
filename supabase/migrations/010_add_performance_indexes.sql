-- Phase 1 Performance Optimization: Add composite indexes

-- Products: for the browse page filtering
CREATE INDEX IF NOT EXISTS idx_products_category_price_is_approved
ON products (category, price, is_approved);

-- Orders: for order history queries
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id_created_at 
ON orders (buyer_id, created_at);
