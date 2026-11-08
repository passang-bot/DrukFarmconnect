const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

// Import API routes
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const farmerRoutes = require("./routes/farmerRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const buyerRoutes = require("./routes/buyerRoutes");
const farmerOrderRoutes = require("./routes/farmerOrderRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("Welcome to DrukFarm Connect API");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "DrukFarm Connect API is running",
  });
});

// Database check
app.get("/api/db-check", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      success: true,
      message: "PostgreSQL connected successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database check error:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// API routes
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/farmer", farmerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/farmer-orders", farmerOrderRoutes);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`DrukFarm Connect server running on port ${PORT}`);
});