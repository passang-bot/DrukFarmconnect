const express = require("express");
const pool = require("../config/db");

const {
  authenticateToken,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Only authenticated farmers can access these routes.
router.use(authenticateToken, requireRole("farmer"));

// GET /api/farmer-orders
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.id,
         o.order_number,
         o.status,
         o.total,
         o.created_at,
         o.delivered_at,
         o.recipient_name,
         o.delivery_phone,
         o.delivery_address,
         o.delivery_city,
         json_agg(
           json_build_object(
             'order_item_id', oi.id,
             'product_name', oi.product_name,
             'quantity', oi.quantity,
             'unit', oi.unit,
             'unit_price', oi.unit_price,
             'line_total', oi.line_total
           )
         ) AS items,
         SUM(oi.line_total) AS farmer_subtotal
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.farmer_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      orders: result.rows,
    });
  } catch (error) {
    console.error("Get farmer orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve farmer orders.",
    });
  }
});

// PUT /api/farmer-orders/:id/status
router.put("/:id/status", async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;

  const allowedStatuses = ["Preparing", "On the Way", "Delivered"];

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID.",
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE orders
       SET status = $1::VARCHAR,
           updated_at = NOW(),
           delivered_at = CASE
             WHEN $1::VARCHAR = 'Delivered'
             THEN COALESCE(delivered_at, NOW())
             ELSE NULL
           END
       WHERE id = $2
         AND farmer_id = $3
       RETURNING id, order_number, status, delivered_at`,
      [status, orderId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this farmer.",
      });
    }

    return res.json({
      success: true,
      message: "Order status updated successfully.",
      order: result.rows[0],
    });
  } catch (error) {
    console.error("Update farmer order status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update order status.",
    });
  }
});

module.exports = router;