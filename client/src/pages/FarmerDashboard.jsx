
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FarmerDashboard.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  unit: "kg",
  category_id: "",
  location: "",
  image_url: "",
};

const emptySummary = {
  totalOrders: 0,
  totalEarnings: 0,
  pendingOrders: 0,
  deliveredOrders: 0,
};

function FarmerDashboard() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [monthlySales, setMonthlySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  const token = localStorage.getItem("token");

  async function loadProducts() {
    try {
      const response = await fetch(`${API_URL}/api/farmer/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load products.");
      }

      setProducts(data.products || []);
    } catch (err) {
      setError(err.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSalesSummary() {
    try {
      const response = await fetch(
        `${API_URL}/api/farmer/sales-summary`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load sales summary.");
      }

      setSummary(data.summary || emptySummary);
    } catch (err) {
      setError(err.message || "Unable to load sales summary.");
    }
  }

  async function loadMonthlySales() {
    try {
      const response = await fetch(
        `${API_URL}/api/farmer/monthly-sales`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load monthly sales.");
      }

      setMonthlySales(data.monthlySales || []);
    } catch (err) {
      setError(err.message || "Unable to load monthly sales.");
    }
  }

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    loadProducts();
    loadSalesSummary();
    loadMonthlySales();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleEdit(product) {
    setEditingProductId(product.id);

    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      quantity: product.quantity ?? "",
      unit: product.unit || "kg",
      category_id: String(product.category_id || ""),
      location: product.location || "",
      image_url: product.image_url || "",
    });

    setShowForm(true);
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const isEditing = editingProductId !== null;

      const response = await fetch(
        isEditing
          ? `${API_URL}/api/farmer/products/${editingProductId}`
          : `${API_URL}/api/farmer/products`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            price: Number(formData.price),
            quantity: Number(formData.quantity),
            category_id: Number(formData.category_id),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save product.");
      }

      setSuccess(
        isEditing
          ? "Product updated successfully!"
          : "Product added successfully!"
      );

      setFormData({ ...emptyForm });
      setEditingProductId(null);
      setShowForm(false);

      await loadProducts();
    } catch (err) {
      setError(err.message || "Unable to save product.");
    }
  }

  async function handleDelete(productId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/farmer/products/${productId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete product.");
      }

      setSuccess("Product deleted successfully!");

      if (editingProductId === productId) {
        setEditingProductId(null);
        setShowForm(false);
        setFormData({ ...emptyForm });
      }

      await loadProducts();
    } catch (err) {
      setError(err.message || "Unable to delete product.");
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditingProductId(null);
    setFormData({ ...emptyForm });
    setError("");
  }

  const maximumEarnings = Math.max(
    ...monthlySales.map((month) => Number(month.earnings)),
    1
  );

  if (loading) {
    return (
      <div className="farmer-dashboard">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="farmer-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Farmer Dashboard</h1>
          <p>Manage your farm products on DrukFarm Connect.</p>
        </div>

        <div className="dashboard-header-actions">
          <button
            type="button"
            className="manage-orders-button"
            onClick={() => navigate("/farmer/orders")}
          >
            Manage Orders
          </button>

          <button
            type="button"
            className="add-product-button"
            onClick={() => {
              if (showForm) {
                closeForm();
              } else {
                setShowForm(true);
                setError("");
                setSuccess("");
              }
            }}
          >
            {showForm ? "Close Form" : "+ Add Product"}
          </button>
        </div>
      </div>

      {error && <p className="dashboard-error">{error}</p>}
      {success && <p className="dashboard-success">{success}</p>}

      {showForm && (
        <form className="add-product-form" onSubmit={handleSubmit}>
          <h2>
            {editingProductId ? "Edit Product" : "Add a New Product"}
          </h2>

          <label>
            Product Name
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Example: Fresh Bhutanese Oranges"
              required
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your farm product"
            />
          </label>

          <div className="form-row">
            <label>
              Price (Nu.)
              <input
                type="number"
                name="price"
                min="0.01"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Quantity
              <input
                type="number"
                name="quantity"
                min="0"
                step="1"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label>
            Unit
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
            >
              <option value="kg">Kilogram (kg)</option>
              <option value="piece">Piece</option>
              <option value="bunch">Bunch</option>
              <option value="litre">Litre</option>
              <option value="bag">Bag</option>
              <option value="dozen">Dozen</option>
            </select>
          </label>

          <label>
            Category
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              <option value="1">Vegetables</option>
              <option value="2">Fruits</option>
              <option value="3">Rice and Grains</option>
              <option value="4">Dairy Products</option>
              <option value="5">Meat and Poultry</option>
              <option value="6">Eggs</option>
              <option value="7">Spices and Herbs</option>
              <option value="8">Organic Products</option>
              <option value="9">Other Farm Products</option>
            </select>
          </label>

          <label>
            Farm Location
            <input
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Example: Paro"
              required
            />
          </label>

          <label>
            Product Image URL (optional)
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </label>

          <button type="submit" className="save-product-button">
            {editingProductId ? "Update Product" : "Save Product"}
          </button>
        </form>
      )}

      <section className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Products</h3>
          <p>{products.length}</p>
        </div>

        <div className="stat-card">
          <h3>Available Products</h3>
          <p>
            {products.filter((product) => product.is_available).length}
          </p>
        </div>

        <div className="stat-card">
          <h3>Total Orders</h3>
          <p>{summary.totalOrders}</p>
        </div>

        <div className="stat-card">
          <h3>Total Earnings</h3>
          <p>Nu. {Number(summary.totalEarnings).toFixed(2)}</p>
        </div>

        <div className="stat-card">
          <h3>Pending Orders</h3>
          <p>{summary.pendingOrders}</p>
        </div>

        <div className="stat-card">
          <h3>Delivered Orders</h3>
          <p>{summary.deliveredOrders}</p>
        </div>
      </section>

      {/* Monthly sales report */}
      <section
        style={{
          background: "#ffffff",
          padding: "24px",
          marginTop: "30px",
          marginBottom: "30px",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Monthly Sales Report</h2>

        <p style={{ color: "#666" }}>
          Your earnings from completed deliveries over the last 12 months.
        </p>

        {monthlySales.length === 0 ? (
          <p>Monthly sales information is not available yet.</p>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "12px",
                height: "230px",
                overflowX: "auto",
                padding: "15px 5px 5px",
                borderBottom: "1px solid #dddddd",
              }}
            >
              {monthlySales.map((month) => {
                const earnings = Number(month.earnings);
                const barHeight =
                  earnings > 0
                    ? Math.max((earnings / maximumEarnings) * 170, 6)
                    : 3;

                return (
                  <div
                    key={month.month}
                    title={`${month.month}: Nu. ${earnings.toFixed(2)}; ${month.deliveredOrders} delivered orders`}
                    style={{
                      flex: "1 0 65px",
                      minWidth: "65px",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: "7px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        textAlign: "center",
                      }}
                    >
                      {earnings.toFixed(0)}
                    </span>

                    <div
                      style={{
                        width: "65%",
                        height: `${barHeight}px`,
                        minHeight: "3px",
                        background: "#27864b",
                        borderRadius: "6px 6px 0 0",
                      }}
                    />

                    <span
                      style={{
                        fontSize: "11px",
                        color: "#555",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {month.month}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "20px",
                marginTop: "20px",
              }}
            >
              {monthlySales.map((month) => (
                <div
                  key={`${month.month}-details`}
                  style={{
                    background: "#f5f8f5",
                    padding: "12px",
                    borderRadius: "8px",
                    flex: "1 1 150px",
                  }}
                >
                  <strong>{month.month}</strong>
                  <p style={{ margin: "8px 0 3px" }}>
                    Nu. {Number(month.earnings).toFixed(2)}
                  </p>
                  <small>
                    {month.deliveredOrders} delivered orders
                  </small>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="products-section">
        <h2>My Products</h2>

        {products.length === 0 ? (
          <p>You haven't added any products yet.</p>
        ) : (
          <div className="products-table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>
                      Nu. {Number(product.price).toFixed(2)}
                    </td>
                    <td>
                      {product.quantity} {product.unit}
                    </td>
                    <td>{product.location}</td>

                    <td>
                      <button
                        type="button"
                        className="edit-product-button"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="delete-product-button"
                        onClick={() => handleDelete(product.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default FarmerDashboard;
