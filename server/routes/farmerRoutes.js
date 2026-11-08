const express = require("express");
const pool = require("../config/db");
const {
  authenticateToken,
  requireRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require a logged-in farmer.
router.use(authenticateToken, requireRole("farmer"));

// GET: Farmer dashboard
router.get("/dashboard", async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Welcome to your farmer dashboard.",
      farmer: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error("Farmer dashboard error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not load farmer dashboard.",
    });
  }
});

// GET: Farmer sales summary
router.get("/sales-summary", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) AS total_orders,
         COALESCE(
           SUM(subtotal) FILTER (WHERE status = 'Delivered'),
           0
         ) AS total_earnings,
         COUNT(*) FILTER (
           WHERE status NOT IN ('Delivered', 'Cancelled')
         ) AS pending_orders,
         COUNT(*) FILTER (
           WHERE status = 'Delivered'
         ) AS delivered_orders
       FROM orders
       WHERE farmer_id = $1`,
      [req.user.id]
    );

    const summary = result.rows[0];

    return res.status(200).json({
      success: true,
      summary: {
        totalOrders: Number(summary.total_orders),
        totalEarnings: Number(summary.total_earnings),
        pendingOrders: Number(summary.pending_orders),
        deliveredOrders: Number(summary.delivered_orders),
      },
    });
  } catch (error) {
    console.error("Farmer sales summary error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load your sales summary.",
    });
  }
});

// GET: Monthly sales for the last 12 months
router.get("/monthly-sales", async (req, res) => {
  try {
    const result = await pool.query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', NOW() AT TIME ZONE 'Asia/Thimphu')
             - INTERVAL '11 months',
           date_trunc('month', NOW() AT TIME ZONE 'Asia/Thimphu'),
           INTERVAL '1 month'
         ) AS month_start
       )
       SELECT
         TO_CHAR(m.month_start, 'Mon YYYY') AS month,
         COALESCE(SUM(o.subtotal), 0) AS earnings,
         COUNT(o.id) AS delivered_orders
       FROM months m
       LEFT JOIN orders o
         ON o.farmer_id = $1
         AND o.status = 'Delivered'
         AND o.delivered_at IS NOT NULL
         AND date_trunc(
           'month',
           o.delivered_at AT TIME ZONE 'Asia/Thimphu'
         ) = m.month_start
       GROUP BY m.month_start
       ORDER BY m.month_start ASC`,
      [req.user.id]
    );

    const monthlySales = result.rows.map((row) => ({
      month: row.month,
      earnings: Number(row.earnings),
      deliveredOrders: Number(row.delivered_orders),
    }));

    return res.status(200).json({
      success: true,
      monthlySales,
    });
  } catch (error) {
    console.error("Farmer monthly sales error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load your monthly sales report.",
    });
  }
});

// GET: View products belonging to the logged-in farmer
router.get("/products", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS category
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.farmer_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      products: result.rows,
    });
  } catch (error) {
    console.error("Get farmer products error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve your products.",
    });
  }
});

// POST: Add a new product
router.post("/products", async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      quantity,
      unit,
      category_id,
      image_url,
      location,
    } = req.body;

    if (
      !name ||
      price === undefined ||
      quantity === undefined ||
      !unit ||
      !category_id ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, price, quantity, unit, category and location are required.",
      });
    }

    const parsedPrice = Number(price);
    const parsedQuantity = Number(quantity);
    const parsedCategoryId = Number(category_id);

    if (
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity < 0 ||
      !Number.isInteger(parsedCategoryId) ||
      parsedCategoryId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid price, quantity and category values.",
      });
    }

    const categoryCheck = await pool.query(
      "SELECT id FROM categories WHERE id = $1",
      [parsedCategoryId]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "The selected category does not exist.",
      });
    }

    const result = await pool.query(
      `INSERT INTO products
       (farmer_id, category_id, name, description, price, quantity,
        unit, image_url, location, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
       RETURNING *`,
      [
        req.user.id,
        parsedCategoryId,
        name.trim(),
        description || null,
        parsedPrice,
        parsedQuantity,
        unit.trim(),
        image_url || null,
        location.trim(),
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Product added successfully.",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Add product error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not add product.",
    });
  }
});

// PUT: Update a product owned by the logged-in farmer
router.put("/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const {
      name,
      description,
      price,
      quantity,
      unit,
      category_id,
      image_url,
      location,
      is_available,
    } = req.body;

    if (
      !name ||
      price === undefined ||
      quantity === undefined ||
      !unit ||
      !category_id ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required product fields.",
      });
    }

    const parsedPrice = Number(price);
    const parsedQuantity = Number(quantity);
    const parsedCategoryId = Number(category_id);

    if (
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity < 0 ||
      !Number.isInteger(parsedCategoryId) ||
      parsedCategoryId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid price, quantity and category values.",
      });
    }

    const categoryCheck = await pool.query(
      "SELECT id FROM categories WHERE id = $1",
      [parsedCategoryId]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "The selected category does not exist.",
      });
    }

    const available =
      typeof is_available === "boolean" ? is_available : true;

    const result = await pool.query(
      `UPDATE products
       SET category_id = $1,
           name = $2,
           description = $3,
           price = $4,
           quantity = $5,
           unit = $6,
           image_url = $7,
           location = $8,
           is_available = $9,
           updated_at = NOW()
       WHERE id = $10 AND farmer_id = $11
       RETURNING *`,
      [
        parsedCategoryId,
        name.trim(),
        description || null,
        parsedPrice,
        parsedQuantity,
        unit.trim(),
        image_url || null,
        location.trim(),
        available,
        productId,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found or you do not own this product.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Update product error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not update product.",
    });
  }
});

// DELETE: Delete a product owned by the logged-in farmer
router.delete("/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM products
       WHERE id = $1 AND farmer_id = $2
       RETURNING id, name`,
      [productId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found or you do not own this product.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
      deletedProduct: result.rows[0],
    });
  } catch (error) {
    console.error("Delete product error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not delete product.",
    });
  }
});

module.exports = router;