import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FarmerOrders.css";

function FarmerOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState(null);

  const token = localStorage.getItem("token");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:5000/api/farmer-orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load orders.");
      }

      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchOrders();
  }, []);

  const updateStatus = async (orderId, status) => {
    try {
      setUpdatingOrder(orderId);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/farmer-orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update order status.");
      }

      await fetchOrders();
    } catch (err) {
      setError(err.message || "Status update failed.");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return <div className="farmer-orders-loading">Loading your orders...</div>;
  }

  return (
    <div className="farmer-orders-page">
      <header className="farmer-orders-header">
        <div>
          <h1>My Customer Orders</h1>
          <p>Manage orders placed for your farm products.</p>
        </div>

        <button onClick={() => navigate("/farmer/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      {error && <div className="farmer-orders-error">{error}</div>}

      <section className="farmer-orders-summary">
        <div className="farmer-orders-summary-card">
          <h3>Total Orders</h3>
          <strong>{orders.length}</strong>
        </div>

        <div className="farmer-orders-summary-card">
          <h3>Preparing</h3>
          <strong>
            {orders.filter((order) => order.status === "Preparing").length}
          </strong>
        </div>

        <div className="farmer-orders-summary-card">
          <h3>On the Way</h3>
          <strong>
            {orders.filter((order) => order.status === "On the Way").length}
          </strong>
        </div>

        <div className="farmer-orders-summary-card">
          <h3>Delivered</h3>
          <strong>
            {orders.filter((order) => order.status === "Delivered").length}
          </strong>
        </div>
      </section>

      {orders.length === 0 ? (
        <div className="farmer-orders-empty">
          <h2>No orders yet</h2>
          <p>New customer orders will appear here.</p>
        </div>
      ) : (
        <section className="farmer-orders-list">
          {orders.map((order) => (
            <article className="farmer-order-card" key={order.id}>
              <div className="farmer-order-top">
                <div>
                  <h2>{order.order_number}</h2>
                  <p>Placed: {formatDate(order.created_at)}</p>
                </div>

                <span className={`farmer-order-status ${order.status
                  .toLowerCase()
                  .replaceAll(" ", "-")}`}>
                  {order.status}
                </span>
              </div>

              <div className="farmer-order-customer">
                <h3>Delivery Information</h3>
                <p><strong>Customer:</strong> {order.recipient_name}</p>
                <p><strong>Phone:</strong> {order.delivery_phone}</p>
                <p><strong>Address:</strong> {order.delivery_address}</p>
                <p><strong>City:</strong> {order.delivery_city}</p>
              </div>

              <div className="farmer-order-items">
                <h3>Products Ordered</h3>

                {(order.items || []).map((item, index) => (
                  <div className="farmer-order-item" key={index}>
                    <span>{item.product_name}</span>
                    <span>
                      {item.quantity} {item.unit} × Nu. {Number(item.unit_price).toFixed(2)}
                    </span>
                    <strong>
                      Nu. {Number(item.line_total).toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="farmer-order-bottom">
                <div>
                  <span>Your Order Total</span>
                  <strong>Nu. {Number(order.farmer_subtotal || 0).toFixed(2)}</strong>
                </div>

                {order.status !== "Delivered" &&
                  order.status !== "Cancelled" && (
                    <div className="farmer-order-actions">
                      <label htmlFor={`status-${order.id}`}>
                        Update order status
                      </label>

                      <select
                        id={`status-${order.id}`}
                        value={order.status}
                        disabled={updatingOrder === order.id}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                      >
                        <option value="Confirmed" disabled>Confirmed</option>
                        <option value="Preparing">Preparing</option>
                        <option value="On the Way">On the Way</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </div>
                  )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default FarmerOrders;