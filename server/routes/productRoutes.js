
const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// GET /api/products
// Retrieve all available products
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.quantity,
        p.unit,
        p.image_url,
        p.location,
        p.is_available,
        c.name AS category,
        u.name AS farmer_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.farmer_id = u.id
      WHERE p.is_available = TRUE
      ORDER BY p.id DESC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      products: result.rows,
    });
  } catch (error) {
    console.error("Get products error details:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve products.",
    });
  }
});

// GET /api/products/:id
// Retrieve one product by ID
router.get("/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.quantity,
          p.unit,
          p.image_url,
          p.location,
          p.is_available,
          c.name AS category,
          u.name AS farmer_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.farmer_id = u.id
        WHERE p.id = $1
          AND p.is_available = TRUE
      `,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Get product by ID error details:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve product.",
    });
  }
});

module.exports = router;
