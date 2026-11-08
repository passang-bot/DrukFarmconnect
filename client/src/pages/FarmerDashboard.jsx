import { useEffect, useState } from "react";
import "./FarmerDashboard.css";

const API_URL = "http://localhost:5000";

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

function FarmerDashboard() {
  const [products, setProducts] = useState([]);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
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
      setError(err.message);
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
      setError(err.message);
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditingProductId(null);
    setFormData({ ...emptyForm });
    setError("");
  }

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

        <button
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

      <div className="dashboard-stats">
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
      </div>

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