
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyOrders.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function MyOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in as a buyer to view your orders.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/buyer/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not load your orders.");
        }

        setOrders(data.orders || []);
      } catch (requestError) {
        setError(
          requestError.message ||
            "Could not connect to the server. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  function formatDate(dateValue) {
    return new Date(dateValue).toLocaleString();
  }

  if (loading) {
    return (
      <main className="my-orders-page">
        <p>Loading your orders...</p>
      </main>
    );
  }

  return (
    <main className="my-orders-page">
      <button
        className="my-orders-back"
        onClick={() => navigate("/")}
      >
        ← Continue shopping
      </button>

      <h1>My Orders</h1>

      <p className="my-orders-intro">
        View your purchases and delivery status.
      </p>

      {error && (
        <p className="my-orders-message my-orders-error" role="alert">
          {error}
        </p>
      )}

      {!error && orders.length === 0 && (
        <section className="my-orders-empty">
          <h2>No orders yet</h2>
          <p>Your orders will appear here after you place an order.</p>

          <button onClick={() => navigate("/")}>
            Browse products
          </button>
        </section>
      )}

      <section className="my-orders-list">
        {orders.map((order) => (
          <article
            className="my-order-card"
            key={order.id}
          >
            <div className="my-order-heading">
              <div>
                <h2>{order.order_number}</h2>

                <p className="my-order-date">
                  {formatDate(order.created_at)}
                </p>
              </div>

              <span className="my-order-status">
                {order.status}
              </span>
            </div>

            <div className="my-order-items">
              {(order.items || []).map((item, index) => (
                <div
                  className="my-order-item"
                  key={`${order.id}-${index}`}
                >
                  <span>
                    {item.product_name} · {item.quantity} {item.unit}
                  </span>

                  <span>
                    Nu. {Number(item.line_total).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="my-order-total">
              <span>Order total</span>

              <strong>
                Nu. {Number(order.total).toFixed(2)}
              </strong>
            </div>

            <button
              type="button"
              className="my-orders-back"
              onClick={() => navigate(`/my-orders/${order.id}`)}
            >
              View Order Details
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

export default MyOrders;
