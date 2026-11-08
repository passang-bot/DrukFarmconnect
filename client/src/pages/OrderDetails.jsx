
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./OrderDetails.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in as a buyer to view this order.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/buyer/orders/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Could not load order details."
          );
        }

        setOrder(data.order);
      } catch (requestError) {
        setError(
          requestError.message ||
            "Could not connect to the server. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id]);

  function formatDate(dateValue) {
    if (!dateValue) return "Not yet estimated";

    return new Date(dateValue).toLocaleString();
  }

  if (loading) {
    return (
      <main className="order-details-page">
        Loading order details...
      </main>
    );
  }

  if (error) {
    return (
      <main className="order-details-page">
        <p className="order-details-error" role="alert">
          {error}
        </p>

        <button onClick={() => navigate("/my-orders")}>
          Back to My Orders
        </button>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="order-details-page">
        <p>Order details are not available.</p>

        <button onClick={() => navigate("/my-orders")}>
          Back to My Orders
        </button>
      </main>
    );
  }

  return (
    <main className="order-details-page">
      <button
        className="order-details-back"
        onClick={() => navigate("/my-orders")}
      >
        ← Back to My Orders
      </button>

      <h1>Order Details</h1>

      <section className="order-details-card">
        <div className="order-details-heading">
          <div>
            <h2>{order.order_number}</h2>

            <p>Placed on {formatDate(order.created_at)}</p>
          </div>

          <span className="order-details-status">
            {order.status}
          </span>
        </div>

        <h3>Delivery Information</h3>

        <div className="order-details-info">
          <p>
            <strong>Recipient:</strong> {order.recipient_name}
          </p>

          <p>
            <strong>Phone:</strong> {order.delivery_phone}
          </p>

          <p>
            <strong>Address:</strong> {order.delivery_address}
          </p>

          <p>
            <strong>City:</strong> {order.delivery_city}
          </p>

          <p>
            <strong>Delivery option:</strong> {order.delivery_option}
          </p>

          <p>
            <strong>Estimated delivery:</strong>{" "}
            {formatDate(order.estimated_delivery)}
          </p>
        </div>

        <h3>Purchased Products</h3>

        <div className="order-details-items">
          {(order.items || []).map((item, index) => (
            <div
              className="order-details-item"
              key={`${order.id}-${index}`}
            >
              <div>
                <strong>{item.product_name}</strong>

                <p>
                  {item.quantity} {item.unit} × Nu.{" "}
                  {Number(item.unit_price).toFixed(2)}
                </p>
              </div>

              <strong>
                Nu. {Number(item.line_total).toFixed(2)}
              </strong>
            </div>
          ))}
        </div>

        <div className="order-details-summary">
          <p>
            <span>Subtotal</span>

            <strong>
              Nu. {Number(order.subtotal).toFixed(2)}
            </strong>
          </p>

          <p>
            <span>Delivery fee</span>

            <strong>
              Nu. {Number(order.delivery_fee).toFixed(2)}
            </strong>
          </p>

          <p className="order-details-grand-total">
            <span>Total</span>

            <strong>
              Nu. {Number(order.total).toFixed(2)}
            </strong>
          </p>
        </div>

        <div className="order-details-tracking">
          <h3>Order Tracking</h3>

          <p>
            Current status: <strong>{order.status}</strong>
          </p>

          <p>
            You can return to My Orders to check for status updates.
          </p>
        </div>
      </section>
    </main>
  );
}

export default OrderDetails;
