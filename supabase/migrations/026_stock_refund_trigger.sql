-- ============================================================
-- 026_stock_refund_trigger.sql
-- Restore menu_items stock_qty when an order status is updated to 'cancelled'
-- ============================================================

DROP TRIGGER IF EXISTS trg_refund_stock_on_cancel ON public.orders;
DROP FUNCTION IF EXISTS public.refund_stock_on_cancel();

CREATE OR REPLACE FUNCTION public.refund_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.menu_items mi
    SET stock_qty = mi.stock_qty + oi.qty
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.menu_item_id = mi.id
      AND mi.stock_qty IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refund_stock_on_cancel
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.refund_stock_on_cancel();
