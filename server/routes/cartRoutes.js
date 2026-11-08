const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/authMiddleware");

// Only logged-in buyers can use the cart
router.use(authenticateToken, requireRole("buyer"));

// GET: View buyer's cart
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
        ci.id AS cart_item_id,
        ci.product_id,
        ci.quantity AS cart_quantity,
        p.name,
        p.price,
        p.unit,
        p.image_url,
        p.location,
        p.quantity AS available_quantity,
        (ci.quantity * p.price) AS subtotal
       FROM carts c
       JOIN cart_items ci ON ci.cart_id = c.id
       JOIN products p ON p.id = ci.product_id
       WHERE c.user_id = $1
       ORDER BY ci.id DESC`,
      [userId]
    );

    const total = result.rows.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0
    );

    res.json({
      success: true,
      items: result.rows,
      total,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve cart.",
    });
  }
});

// POST: Add product to cart
router.post("/items", async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    const parsedProductId = Number(productId);
    const parsedQuantity = Number(quantity);

    if (
      !Number.isInteger(parsedProductId) ||
      parsedProductId <= 0 ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid product and quantity are required.",
      });
    }

    const productResult = await pool.query(
      `SELECT id, quantity, is_available
       FROM products
       WHERE id = $1`,
      [parsedProductId]
    );

    if (
      productResult.rows.length === 0 ||
      !productResult.rows[0].is_available
    ) {
      return res.status(404).json({
        success: false,
        message: "Product is not available.",
      });
    }

    const product = productResult.rows[0];

    const cartResult = await pool.query(
      `INSERT INTO carts (user_id)
       VALUES ($1)
       ON CONFLICT (user_id)
       DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING id`,
      [userId]
    );

    const cartId = cartResult.rows[0].id;

    const existingResult = await pool.query(
      `SELECT id, quantity
       FROM cart_items
       WHERE cart_id = $1 AND product_id = $2`,
      [cartId, parsedProductId]
    );

    const existingQuantity = existingResult.rows.length
      ? Number(existingResult.rows[0].quantity)
      : 0;

    if (existingQuantity + parsedQuantity > Number(product.quantity)) {
      return res.status(400).json({
        success: false,
        message: "Requested quantity exceeds available stock.",
      });
    }

    await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [cartId, parsedProductId, parsedQuantity]
    );

    res.status(201).json({
      success: true,
      message: "Product added to cart.",
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to add product to cart.",
    });
  }
});

// PUT: Update cart item quantity
router.put("/items/:itemId", async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = Number(req.params.itemId);
    const quantity = Number(req.body.quantity);

    if (
      !Number.isInteger(itemId) ||
      itemId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid item and quantity are required.",
      });
    }

    const result = await pool.query(
      `UPDATE cart_items ci
       SET quantity = $1
       FROM carts c, products p
       WHERE ci.id = $2
         AND ci.cart_id = c.id
         AND ci.product_id = p.id
         AND c.user_id = $3
         AND p.is_available = TRUE
         AND $1 <= p.quantity
       RETURNING ci.id`,
      [quantity, itemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found or requested stock unavailable.",
      });
    }

    res.json({
      success: true,
      message: "Cart quantity updated.",
    });
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update cart.",
    });
  }
});

// DELETE: Remove item from cart
router.delete("/items/:itemId", async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = Number(req.params.itemId);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item.",
      });
    }

    const result = await pool.query(
      `DELETE FROM cart_items ci
       USING carts c
       WHERE ci.id = $1
         AND ci.cart_id = c.id
         AND c.user_id = $2
       RETURNING ci.id`,
      [itemId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found.",
      });
    }

    res.json({
      success: true,
      message: "Product removed from cart.",
    });
  } catch (error) {
    console.error("Remove cart item error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to remove product.",
    });
  }
});

module.exports = router;