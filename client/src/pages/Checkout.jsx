import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Checkout.css";

const API_URL = "http://localhost:5000";

function Checkout() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    recipientName: "",
    phone: "",
    addressLine: "",
    city: "",
    district: "",
    postalCode: "",
    deliveryInstructions: "",
    deliveryOption: "standard",
    paymentMethod: "cash_on_delivery",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in before placing your order.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/orders/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Checkout failed.");
      }

      if (
        !data.success ||
        !Array.isArray(data.orders) ||
        data.orders.length === 0
      ) {
        throw new Error(
          "The server did not return valid order confirmation details."
        );
      }

      navigate("/order-success", {
        replace: true,
        state: {
          orders: data.orders,
          grandTotal: data.grandTotal,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus,
        },
      });
    } catch (err) {
      console.error("Checkout submission error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-heading">
          <h1>Checkout</h1>
          <p>Enter your delivery details to place your order.</p>
        </div>

        <form onSubmit={handleSubmit} className="checkout-form">
          <section className="checkout-section">
            <h2>Delivery Information</h2>

            <label htmlFor="recipientName">Recipient Name *</label>
            <input
              id="recipientName"
              name="recipientName"
              type="text"
              value={formData.recipientName}
              onChange={handleChange}
              placeholder="Enter recipient name"
              required
            />

            <label htmlFor="phone">Phone Number *</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              required
            />

            <label htmlFor="addressLine">Delivery Address *</label>
            <textarea
              id="addressLine"
              name="addressLine"
              value={formData.addressLine}
              onChange={handleChange}
              placeholder="House number, street, village or locality"
              required
              rows="3"
            />

            <label htmlFor="city">City / Town *</label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Thimphu"
              required
            />

            <label htmlFor="district">District</label>
            <input
              id="district"
              name="district"
              type="text"
              value={formData.district}
              onChange={handleChange}
              placeholder="e.g. Thimphu"
            />

            <label htmlFor="postalCode">Postal Code</label>
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="Optional"
            />

            <label htmlFor="deliveryInstructions">
              Delivery Instructions
            </label>
            <textarea
              id="deliveryInstructions"
              name="deliveryInstructions"
              value={formData.deliveryInstructions}
              onChange={handleChange}
              placeholder="Optional delivery instructions"
              rows="2"
            />
          </section>

          <section className="checkout-section">
            <h2>Delivery Option</h2>

            <select
              name="deliveryOption"
              value={formData.deliveryOption}
              onChange={handleChange}
            >
              <option value="standard">Standard Delivery</option>
            </select>
          </section>

          <section className="checkout-section">
            <h2>Payment Method</h2>

            <label className="payment-option">
              <input
                type="radio"
                name="paymentMethod"
                value="cash_on_delivery"
                checked={
                  formData.paymentMethod === "cash_on_delivery"
                }
                onChange={handleChange}
              />
              Cash on Delivery
            </label>

            <p className="checkout-note">
              Pay when your order is delivered. Online payment
              options will be added after payment provider
              integration.
            </p>
          </section>

          {error && (
            <div className="checkout-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="place-order-button"
            disabled={loading}
          >
            {loading ? "Placing Order..." : "Place Order"}
          </button>

          <button
            type="button"
            className="back-to-cart-button"
            onClick={() => navigate("/cart")}
          >
            Back to Cart
          </button>
        </form>
      </div>
    </div>
  );
}

export default Checkout;