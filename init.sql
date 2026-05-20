-- =============================================================================
-- init.sql — Idempotent Order Management Schema with CDC NOTIFY Trigger
-- Algorithmic Trading Order Dashboard — Enterprise CDC Pipeline
-- =============================================================================
-- Safe to run multiple times; all DDL statements guard against re-creation.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- TABLE: orders
-- Central ledger tracking all order lifecycle states.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id            SERIAL        PRIMARY KEY,
  customer_name TEXT          NOT NULL,
  product_name  TEXT          NOT NULL,
  status        TEXT          NOT NULL CHECK (status IN ('pending', 'shipped', 'delivered')),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- FUNCTION: notify_order_mutation()
-- Fires after every INSERT / UPDATE / DELETE row event on `orders`.
-- Assembles a JSON payload matching the frontend WebSocketMessage contract
-- and broadcasts it via pg_notify on channel 'order_updates'.
--
-- Payload shape (strict contract):
--   {
--     "eventType": "INSERT" | "UPDATE" | "DELETE",   -- from TG_OP
--     "new":       { ...full order row }              -- INSERT and UPDATE only
--     "old":       { "id": <number> }                -- DELETE only
--     "timestamp": "YYYY-MM-DDTHH24:MI:SSZ"          -- ISO 8601 UTC string
--   }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_order_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  payload TEXT;
BEGIN
  -- Build the JSON payload conforming exactly to the frontend contract.
  -- TG_OP is a Postgres magic variable: 'INSERT', 'UPDATE', or 'DELETE'.
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- INSERT / UPDATE: include `new` row; omit `old` entirely.
    payload := json_build_object(
      'eventType', TG_OP,
      'new',       row_to_json(NEW),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )::text;

  ELSIF TG_OP = 'DELETE' THEN
    -- DELETE: include only the `old` id; omit `new` entirely.
    payload := json_build_object(
      'eventType', TG_OP,
      'old',       json_build_object('id', OLD.id),
      'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )::text;
  END IF;

  -- Broadcast the assembled payload to all LISTEN subscribers on this channel.
  PERFORM pg_notify('order_updates', payload);

  -- Triggers must always return the appropriate row reference.
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- TRIGGER: check_order_mutation
-- Binds the notify function to the orders table for all mutating operations.
-- Uses DROP + CREATE pattern to guarantee idempotent re-runs.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS check_order_mutation ON orders;

CREATE TRIGGER check_order_mutation
  AFTER INSERT OR UPDATE OR DELETE
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_mutation();
