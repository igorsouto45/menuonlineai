-- Add new status to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'out_for_delivery' AFTER 'ready';