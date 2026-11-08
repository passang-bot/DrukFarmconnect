import { useLocation, useNavigate } from "react-router-dom";
import "./OrderSuccess.css";

function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  const orderData = location.state;

  // Prevent access without a successful checkout result.
  if (!orderData || !orderData.orders || orderData.orders.length === 0) {
    return (
      <div className="order-success-page">
        <div className="order-success-card">
          <h2>No order information found</h2>
          <p>Please visit your cart to place an order.</p>
          <button onClick={() => navigate("/cart")}>
            Go to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-success-page">
      <div className="order-success-card">
        <div className="success-icon">✓</div>

        <h1>Thank You for Your Order!</h1>

        <p className="success-message">
          Your order has been placed successfully.
          Thank you for supporting Bhutanese farmers.
        </p>

        <div className="order-success-details">
          <h2>Order Details</h2>

          {orderData.orders.map((order) => (
            <div className="success-order-item" key={order.id}>
              <p>
                <strong>Order Number:</strong>
                <span>{order.orderNumber}</span>
              </p>

              <p>
                <strong>Order Status:</strong>
                <span>{order.status}</span>
              </p>

              <p>
                <strong>Order Subtotal:</strong>
                <span>
                  Nu. {Number(order.subtotal).toFixed(2)}
                </span>
              </p>

              <p>
                <strong>Delivery Fee:</strong>
                <span>
                  Nu. {Number(order.deliveryFee).toFixed(2)}
                </span>
              </p>

              <p>
                <strong>Order Total:</strong>
                <span>
                  Nu. {Number(order.total).toFixed(2)}
                </span>
              </p>
            </div>
          ))}

          <div className="success-payment">
            <p>
              <strong>Payment Method:</strong>
              <span>Cash on Delivery</span>
            </p>

            <p>
              <strong>Payment Status:</strong>
              <span>Pending</span>
            </p>
          </div>

          <div className="success-grand-total">
            <strong>Grand Total</strong>
            <strong>
              Nu. {Number(orderData.grandTotal).toFixed(2)}
            </strong>
          </div>
        </div>

        <p className="delivery-thank-you">
          Please prepare the payment when your order arrives.
        </p>

        <button
          className="continue-shopping-button"
          onClick={() => navigate("/")}
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

export default OrderSuccess;