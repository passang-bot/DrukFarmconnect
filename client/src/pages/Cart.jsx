
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Cart.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function Cart() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const token = localStorage.getItem("token");

  async function loadCart() {
    if (!token) {
      setError("Please log in as a buyer to view your cart.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load your cart.");
      }

      setItems(data.items || []);
    } catch (err) {
      setError(err.message || "Unable to load your cart.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function updateQuantity(item, newQuantity) {
    if (newQuantity < 1) return;

    if (newQuantity > Number(item.available_quantity)) {
      setError(
        `Only ${item.available_quantity} units are currently available for ${item.name}.`
      );
      return;
    }

    try {
      setUpdatingId(item.cart_item_id);
      setError("");

      const response = await fetch(
        `${API_URL}/api/cart/items/${item.cart_item_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity: newQuantity }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update quantity.");
      }

      await loadCart();
    } catch (err) {
      setError(err.message || "Unable to update quantity.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeItem(itemId) {
    try {
      setUpdatingId(itemId);
      setError("");

      const response = await fetch(
        `${API_URL}/api/cart/items/${itemId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not remove item.");
      }

      await loadCart();
    } catch (err) {
      setError(err.message || "Unable to remove item.");
    } finally {
      setUpdatingId(null);
    }
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0
  );

  if (loading) {
    return (
      <div className="cart-page">
        <p className="cart-message">Loading your cart...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="cart-page">
        <h1>Your Shopping Cart</h1>
        <p>Please log in to view your cart.</p>
        <button onClick={() => navigate("/login")}>
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <div>
          <h1>Your Shopping Cart</h1>
          <p>Review your fresh farm products before checkout.</p>
        </div>

        <Link to="/" className="continue-shopping">
          Continue Shopping
        </Link>
      </div>

      {error && <div className="cart-error">{error}</div>}

      {items.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Discover fresh products from Bhutanese farmers.</p>
          <Link to="/" className="shop-button">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => (
              <div className="cart-item" key={item.cart_item_id}>
                <div className="cart-product-image">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} />
                  ) : (
                    <span>🌱</span>
                  )}
                </div>

                <div className="cart-product-details">
                  <h3>{item.name}</h3>
                  <p>Location: {item.location || "Bhutan"}</p>
                  <p>
                    Nu. {Number(item.price).toFixed(2)} / {item.unit}
                  </p>
                  <strong>
                    Subtotal: Nu. {Number(item.subtotal).toFixed(2)}
                  </strong>

                  <div className="cart-item-actions">
                    <div className="quantity-control">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item,
                            Number(item.cart_quantity) - 1
                          )
                        }
                        disabled={
                          updatingId === item.cart_item_id ||
                          Number(item.cart_quantity) <= 1
                        }
                      >
                        −
                      </button>

                      <span>{item.cart_quantity}</span>

                      <button
                        onClick={() =>
                          updateQuantity(
                            item,
                            Number(item.cart_quantity) + 1
                          )
                        }
                        disabled={
                          updatingId === item.cart_item_id ||
                          Number(item.cart_quantity) >=
                            Number(item.available_quantity)
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="remove-button"
                      onClick={() => removeItem(item.cart_item_id)}
                      disabled={updatingId === item.cart_item_id}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>

            <div className="summary-row">
              <span>Items</span>
              <span>
                {items.reduce(
                  (sum, item) => sum + Number(item.cart_quantity),
                  0
                )}
              </span>
            </div>

            <div className="summary-row total-row">
              <strong>Total</strong>
              <strong>Nu. {total.toFixed(2)}</strong>
            </div>

            <button
              className="checkout-button"
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout
            </button>

            <p className="cart-note">
              Final delivery charges, if applicable, will be shown during
              checkout.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;
