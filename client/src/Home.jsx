import { useState, useEffect } from "react";
import "./App.css";

// Backend API address
const API_URL = "http://localhost:5000";

// Product categories
const categories = [
  { name: "All Products", emoji: "🌱" },
  { name: "Vegetables", emoji: "🥬" },
  { name: "Fruits", emoji: "🍎" },
  { name: "Rice and Grains", emoji: "🌾" },
  { name: "Dairy Products", emoji: "🥛" },
  { name: "Meat and Poultry", emoji: "🍗" },
  { name: "Eggs", emoji: "🥚" },
  { name: "Spices and Herbs", emoji: "🌶️" },
  { name: "Organic Products", emoji: "🌿" },
  { name: "Other Farm Products", emoji: "🧺" },
];

// Main application
function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Products");

  // Cart state now comes from PostgreSQL
  const [cart, setCart] = useState([]);
  const [cartMessage, setCartMessage] = useState("");
  const [addingProductId, setAddingProductId] = useState(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get logged-in user safely
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }

  // Navigate to registration page
  function goToRegister() {
    window.location.href = "/register";
  }

  // Navigate to login page
  function goToLogin() {
    window.location.href = "/login";
  }

  // Load products from PostgreSQL backend
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch(`${API_URL}/api/products`);

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.products)) {
          throw new Error("Invalid product data received.");
        }

        const formattedProducts = data.products.map((product) => {
          let emoji = "🌱";
          let color = "#eaf4e5";

          const productName = product.name.toLowerCase();

          if (productName.includes("rice")) {
            emoji = "🌾";
            color = "#f5eedc";
          } else if (productName.includes("potato")) {
            emoji = "🥔";
            color = "#f6eddf";
          } else if (productName.includes("tomato")) {
            emoji = "🍅";
            color = "#fff0e9";
          } else if (productName.includes("chilli")) {
            emoji = "🌶️";
            color = "#eaf4e5";
          } else if (productName.includes("carrot")) {
            emoji = "🥕";
            color = "#fff0df";
          } else if (productName.includes("cabbage")) {
            emoji = "🥬";
            color = "#e8f2e5";
          } else if (productName.includes("apple")) {
            emoji = "🍎";
            color = "#fff0e9";
          }

          return {
            ...product,
            price: Number(product.price),
            farmer: product.farmer_name,
            location: `${product.location}, Bhutan`,
            emoji,
            color,
            badge: "Farm fresh",
          };
        });

        setProducts(formattedProducts);
      } catch (err) {
        console.error("Product loading error:", err);

        setError(
          "Unable to load products. Please check that your backend server is running."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Load saved cart from PostgreSQL
  async function loadCart() {
    const token = localStorage.getItem("token");
    const user = getCurrentUser();

    if (!token || !user || user.role !== "buyer") {
      setCart([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load your cart.");
      }

      setCart(data.items || []);
    } catch (err) {
      console.error("Cart loading error:", err);
    }
  }

  // Load cart when homepage opens
  useEffect(() => {
    loadCart();
  }, []);

  // Filter products by category and search
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      category === "All Products" ||
      product.category === category;

    const searchTerm = search.toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm) ||
      (product.farmer || "").toLowerCase().includes(searchTerm) ||
      product.location.toLowerCase().includes(searchTerm) ||
      (product.category || "").toLowerCase().includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  // Calculate total number of individual cart items
  const cartCount = cart.reduce(
    (sum, item) => sum + Number(item.cart_quantity || 0),
    0
  );

  // Calculate cart total
  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0
  );

  // Add product to PostgreSQL cart
  async function addToCart(product) {
    const token = localStorage.getItem("token");
    const user = getCurrentUser();

    if (!token || !user || user.role !== "buyer") {
      alert("Please log in with a buyer account to add products to your cart.");
      goToLogin();
      return;
    }

    setAddingProductId(product.id);
    setCartMessage("");

    try {
      const response = await fetch(`${API_URL}/api/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to add product to cart.");
      }

      setCartMessage(`${product.name} added to your cart!`);

      await loadCart();
    } catch (err) {
      console.error("Add to cart error:", err);
      setCartMessage(err.message);
    } finally {
      setAddingProductId(null);
    }
  }

  // Display cart summary
  function showCart() {
    const user = getCurrentUser();

    if (!localStorage.getItem("token") || !user || user.role !== "buyer") {
      alert("Please log in with a buyer account to view your cart.");
      goToLogin();
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is currently empty.");
      return;
    }

    const cartSummary = cart
      .map(
        (item) =>
          `${item.name} x ${item.cart_quantity} = Nu. ${Number(
            item.subtotal
          ).toFixed(2)}`
      )
      .join("\n");

    alert(
      `YOUR DRUKFARM CART\n\n${cartSummary}\n\nTotal: Nu. ${cartTotal.toFixed(
        2
      )}`
    );
  }

  return (
    <div className="app">

      {/* Navigation */}
      <nav className="navbar">
        <a href="/" className="brand">
          <span className="brand-icon">🌿</span>
          <span>
            DrukFarm
            <span className="brand-green"> Connect</span>
          </span>
        </a>

        <div className="nav-links">
          <a href="#products">Marketplace</a>
          <a href="#how-it-works">How it works</a>
          <a href="#farmers">For Farmers</a>
        </div>

        <div className="nav-actions">
          <button
            className="login-btn"
            onClick={goToLogin}
          >
            Log in
          </button>

          <button
            className="signup-btn"
            onClick={goToRegister}
          >
            Get Started
          </button>

          <button
            className="cart-btn"
            onClick={showCart}
          >
            🛒 <span className="cart-count">{cartCount}</span>
          </button>
        </div>
      </nav>

      {/* Hero section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-label">
            <span className="status-dot"></span>
            CONNECTING BHUTAN'S FARMERS
          </div>

          <h1>
            Fresh from the
            <br />
            <span className="hero-highlight">
              farm to your
            </span>{" "}
            table.
          </h1>

          <p className="hero-description">
            Discover fresh, locally grown produce from Bhutanese
            farmers. Support local agriculture and enjoy nature's
            goodness, delivered to your doorstep.
          </p>

          <div className="hero-buttons">
            <a href="#products" className="primary-btn">
              Explore Marketplace <span>→</span>
            </a>

            <a href="#farmers" className="secondary-btn">
              Become a Farmer
            </a>
          </div>

          <div className="hero-stats">
            <div>
              <strong>100%</strong>
              <span>Locally sourced</span>
            </div>

            <div>
              <strong>Fresh</strong>
              <span>From our farmers</span>
            </div>

            <div>
              <strong>Bhutan</strong>
              <span>Our home, our harvest</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image">
            <div className="hero-image-content">
              <span className="hero-leaf">🌱</span>
              <span className="hero-image-title">
                Grown with care.
              </span>
              <span className="hero-image-subtitle">
                Harvested with love.
              </span>
            </div>
          </div>

          <div className="floating-card">
            <span className="floating-icon">🥬</span>
            <div>
              <strong>Fresh & Local</strong>
              <span>Direct from Bhutanese farms</span>
            </div>
          </div>

          <div className="hero-decoration">✳</div>
        </div>
      </section>

      {/* Benefits */}
      <section className="benefits">
        <div className="benefit">
          <span>🌱</span>
          <div>
            <strong>Farm Fresh</strong>
            <p>Freshly harvested produce</p>
          </div>
        </div>

        <div className="benefit">
          <span>🤝</span>
          <div>
            <strong>Support Local</strong>
            <p>Empowering Bhutanese farmers</p>
          </div>
        </div>

        <div className="benefit">
          <span>🚚</span>
          <div>
            <strong>Easy Access</strong>
            <p>Shop local produce online</p>
          </div>
        </div>
      </section>

      {/* Marketplace */}
      <section className="marketplace" id="products">
        <div className="section-heading">
          <div>
            <span className="section-label">
              OUR MARKETPLACE
            </span>

            <h2>Fresh picks for you</h2>

            <p>
              Discover the goodness of Bhutan's local harvest.
            </p>
          </div>

          <a href="#products" className="view-all">
            View all products →
          </a>
        </div>

        {/* Search */}
        <div className="search-container">
          <span className="search-icon">🔍</span>

          <input
            type="text"
            placeholder="Search vegetables, fruits, farmers..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <button onClick={() => setSearch("")}>
            Clear
          </button>
        </div>

        {/* Categories */}
        <div className="categories">
          {categories.map((item) => (
            <button
              key={item.name}
              className={`category-btn ${
                category === item.name ? "active" : ""
              }`}
              onClick={() => setCategory(item.name)}
            >
              <span>{item.emoji}</span>
              {item.name}
            </button>
          ))}
        </div>

        {/* Cart feedback */}
        {cartMessage && (
          <div className="cart-message" role="status">
            {cartMessage}
            <button
              type="button"
              onClick={() => setCartMessage("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading message */}
        {loading && (
          <p className="loading-message">
            Loading fresh products from our farmers...
          </p>
        )}

        {/* Error message */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}

        {/* Product cards */}
        {!loading && !error && (
          <>
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article
                  className="product-card"
                  key={product.id}
                >
                  <div
                    className="product-image"
                    style={{
                      backgroundColor: product.color,
                    }}
                  >
                    <span className="product-badge">
                      {product.badge}
                    </span>

                    <span className="product-emoji">
                      {product.emoji}
                    </span>
                  </div>

                  <div className="product-info">
                    <span className="product-category">
                      {product.category}
                    </span>

                    <h3>{product.name}</h3>

                    <div className="farmer-info">
                      <span>👨‍🌾</span>
                      <span>{product.farmer}</span>
                    </div>

                    <div className="product-location">
                      📍 {product.location}
                    </div>

                    <div className="product-footer">
                      <div className="price">
                        <strong>
                          Nu. {product.price.toFixed(2)}
                        </strong>

                        <span> / {product.unit}</span>
                      </div>

                      <button
                        className="add-btn"
                        onClick={() => addToCart(product)}
                        disabled={
                          addingProductId === product.id ||
                          Number(product.quantity) <= 0
                        }
                        aria-label={`Add ${product.name} to cart`}
                        title={
                          Number(product.quantity) <= 0
                            ? "Out of stock"
                            : "Add to cart"
                        }
                      >
                        {addingProductId === product.id ? "…" : "+"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Empty search results */}
            {filteredProducts.length === 0 && (
              <div className="empty-state">
                <span>🔎</span>
                <h3>No products found</h3>

                <p>
                  Try another search or category.
                </p>

                <button
                  className="primary-btn"
                  onClick={() => {
                    setSearch("");
                    setCategory("All Products");
                  }}
                >
                  Show all products
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Farmer section */}
      <section className="farmer-section" id="farmers">
        <div className="farmer-section-content">
          <span className="section-label">
            GROW WITH US
          </span>

          <h2>
            Your harvest deserves a bigger market.
          </h2>

          <p>
            Join DrukFarm Connect and connect directly with buyers
            across Bhutan. Share your produce, grow your business,
            and strengthen our local farming community.
          </p>

          <button
            className="farmer-cta"
            onClick={goToRegister}
          >
            Join as a Farmer →
          </button>
        </div>

        <div className="farmer-illustration">
          👩‍🌾🌾
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" id="how-it-works">
        <a href="/" className="brand footer-brand">
          🌿 DrukFarm{" "}
          <span className="brand-green">Connect</span>
        </a>

        <p>
          Supporting Bhutanese farmers, one harvest at a time.
        </p>

        <span className="footer-copy">
          © 2026 DrukFarm Connect. Made with 💚 in Bhutan.
        </span>
      </footer>

    </div>
  );
}

export default App;