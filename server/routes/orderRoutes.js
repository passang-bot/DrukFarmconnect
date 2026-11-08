const express = require("express");
const crypto = require("crypto");
const pool = require("../config/db");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Only logged-in buyers can place orders.
router.use(authenticateToken, requireRole("buyer"));

// POST /api/orders/checkout
router.post("/checkout", async (req, res) => {
  const {
    recipientName,
    phone,
    addressLine,
    city,
    district,
    postalCode,
    deliveryInstructions,
    deliveryOption,
    paymentMethod,
  } = req.body;

  // Validate required delivery information.
  if (
    !recipientName ||
    !phone ||
    !addressLine ||
    !city
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Recipient name, phone, address and city are required.",
    });
  }

  // Only enable Cash on Delivery until a payment provider
  // has been properly integrated.
  if (paymentMethod !== "cash_on_delivery") {
    return res.status(400).json({
      success: false,
      message:
        "Only Cash on Delivery is currently available.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const buyerId = req.user.id;

    // Lock the buyer's cart while checkout is being processed.
    const cartResult = await client.query(
      `SELECT id
       FROM carts
       WHERE user_id = $1
       FOR UPDATE`,
      [buyerId]
    );

    if (cartResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    const cartId = cartResult.rows[0].id;

    // Lock cart items and their products to prevent
    // stock changes during checkout.
    const itemsResult = await client.query(
      `SELECT
         ci.id AS cart_item_id,
         ci.product_id,
         ci.quantity AS cart_quantity,
         p.farmer_id,
         p.name,
         p.price,
         p.unit,
         p.quantity AS available_quantity,
         p.is_available
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       ORDER BY p.farmer_id, p.id
       FOR UPDATE OF ci, p`,
      [cartId]
    );

    if (itemsResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    // Check product availability and stock.
    for (const item of itemsResult.rows) {
      const requestedQuantity = Number(item.cart_quantity);
      const availableQuantity = Number(item.available_quantity);

      if (
        !item.is_available ||
        requestedQuantity <= 0 ||
        requestedQuantity > availableQuantity
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Insufficient stock or unavailable product: ${item.name}. Please update your cart.`,
        });
      }
    }

    // Save the delivery address.
    const addressResult = await client.query(
      `INSERT INTO addresses (
         user_id,
         recipient_name,
         phone,
         address_line,
         city,
         district,
         postal_code,
         delivery_instructions,
         is_default
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
       RETURNING id`,
      [
        buyerId,
        recipientName.trim(),
        phone.trim(),
        addressLine.trim(),
        city.trim(),
        district || null,
        postalCode || null,
        deliveryInstructions || null,
      ]
    );

    const addressId = addressResult.rows[0].id;

    // Group cart items by farmer.
    const farmerGroups = new Map();

    for (const item of itemsResult.rows) {
      const farmerId = String(item.farmer_id);

      if (!farmerGroups.has(farmerId)) {
        farmerGroups.set(farmerId, []);
      }

      farmerGroups.get(farmerId).push(item);
    }

    const createdOrders = [];

    // Create one order for each farmer.
    for (const [farmerId, farmerItems] of farmerGroups) {
      let subtotal = 0;

      for (const item of farmerItems) {
        subtotal +=
          Number(item.price) * Number(item.cart_quantity);
      }

      // Delivery fee is temporarily zero.
      const deliveryFee = 0;
      const total = subtotal + deliveryFee;

      const orderNumber =
        `DFC-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

      const orderResult = await client.query(
        `INSERT INTO orders (
           order_number,
           buyer_id,
           farmer_id,
           address_id,
           recipient_name,
           delivery_phone,
           delivery_address,
           delivery_city,
           delivery_option,
           subtotal,
           delivery_fee,
           total,
           status
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Confirmed'
         )
         RETURNING id, order_number, subtotal, delivery_fee, total, status`,
        [
          orderNumber,
          buyerId,
          farmerId,
          addressId,
          recipientName.trim(),
          phone.trim(),
          addressLine.trim(),
          city.trim(),
          deliveryOption || "standard",
          subtotal,
          deliveryFee,
          total,
        ]
      );

      const order = orderResult.rows[0];

      // Save each product as an order item.
      for (const item of farmerItems) {
        const quantity = Number(item.cart_quantity);
        const unitPrice = Number(item.price);
        const lineTotal = quantity * unitPrice;

        await client.query(
          `INSERT INTO order_items (
             order_id,
             product_id,
             product_name,
             quantity,
             unit,
             unit_price,
             line_total
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            order.id,
            item.product_id,
            item.name,
            quantity,
            item.unit,
            unitPrice,
            lineTotal,
          ]
        );

        // Reduce available product stock.
        await client.query(
          `UPDATE products
           SET
             quantity = quantity - $1,
             is_available = CASE
               WHEN quantity - $1 <= 0 THEN false
               ELSE true
             END,
             updated_at = NOW()
           WHERE id = $2`,
          [quantity, item.product_id]
        );
      }

      // Create a pending Cash on Delivery payment record.
      await client.query(
        `INSERT INTO payments (
           order_id,
           payment_method,
           payment_status,
           amount
         )
         VALUES ($1, 'cash_on_delivery', 'pending', $2)`,
        [order.id, total]
      );

      createdOrders.push({
        id: order.id,
        orderNumber: order.order_number,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee),
        total: Number(order.total),
        status: order.status,
      });
    }

    // Clear the cart only after all orders are created.
    await client.query(
      `DELETE FROM cart_items
       WHERE cart_id = $1`,
      [cartId]
    );

    await client.query("COMMIT");

    const grandTotal = createdOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    return res.status(201).json({
      success: true,
      message: "Your order has been placed successfully.",
      paymentMethod: "cash_on_delivery",
      paymentStatus: "pending",
      orders: createdOrders,
      grandTotal,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Checkout error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to place your order. Please try again.",
    });
  } finally {
    client.release();
  }
});

module.exports = router;