const express = require("express");
const pool = require("../config/db");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Only logged-in buyers can access these routes.
router.use(authenticateToken, requireRole("buyer"));

// GET /api/buyer/orders
// Retrieve all orders belonging to the logged-in buyer.
router.get("/orders", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.id,
         o.order_number,
         o.total,
         o.status,
         o.delivery_option,
         o.delivery_fee,
         o.created_at,
         o.estimated_delivery,
         COALESCE(
           json_agg(
             json_build_object(
               'product_name', oi.product_name,
               'quantity', oi.quantity,
               'unit', oi.unit,
               'unit_price', oi.unit_price,
               'line_total', oi.line_total
             )
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'
         ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.buyer_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      count: result.rows.length,
      orders: result.rows,
    });
  } catch (error) {
    console.error("Get buyer orders error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve your orders.",
    });
  }
});

// GET /api/buyer/orders/:id
// Retrieve one order belonging to the logged-in buyer.
router.get("/orders/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const result = await pool.query(
      `SELECT
         o.id,
         o.order_number,
         o.total,
         o.subtotal,
         o.delivery_fee,
         o.status,
         o.delivery_option,
         o.recipient_name,
         o.delivery_phone,
         o.delivery_address,
         o.delivery_city,
         o.created_at,
         o.estimated_delivery,
         json_agg(
           json_build_object(
             'product_name', oi.product_name,
             'quantity', oi.quantity,
             'unit', oi.unit,
             'unit_price', oi.unit_price,
             'line_total', oi.line_total
           )
         ) FILTER (WHERE oi.id IS NOT NULL) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 AND o.buyer_id = $2
       GROUP BY o.id`,
      [orderId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    res.json({
      success: true,
      order: result.rows[0],
    });
  } catch (error) {
    console.error("Get buyer order details error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve order details.",
    });
  }
});

module.exports = router;