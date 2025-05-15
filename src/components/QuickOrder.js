import React, { useEffect, useState } from 'react';
import './QuickOrder.css';

const QuickOrder = ({ customerId }) => {
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connectionTest, setConnectionTest] = useState(null);

    useEffect(() => {
        const testConnection = async () => {
            try {
                // First test server connection
                const testResponse = await fetch('https://quick-orders-nine.vercel.app/api/test');
                if (!testResponse.ok) {
                    throw new Error('Server connection failed');
                }
                setConnectionTest(await testResponse.json());

                // Then try to fetch orders with customer ID from props
                const ordersResponse = await fetch(`https://quick-orders-nine.vercel.app/api/orders?customer_id=${customerId}`);
                if (!ordersResponse.ok) {
                    throw new Error(`Orders fetch failed with status ${ordersResponse.status}`);
                }
                setOrders(await ordersResponse.json());
            } catch (err) {
                console.error('Error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (customerId) {
            testConnection();
        }
    }, [customerId]);

    return (
        <div className="quick-order-container">
            <h1>Quick Order Debug</h1>
            
            {loading ? (
                <div className="loading">Testing connections...</div>
            ) : error ? (
                <div className="error">
                    <p>Error: {error}</p>
                    {connectionTest && (
                        <div>
                            <p>Server test passed at: {new Date(connectionTest.time).toLocaleString()}</p>
                            <p>But orders fetch failed - check:</p>
                            <ul>
                                <li>Shopify API credentials in .env</li>
                                <li>Shop name matches exactly</li>
                                <li>Server console for errors</li>
                            </ul>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <p>Connection test successful at: {new Date(connectionTest.time).toLocaleString()}</p>
                    <div className="orders-list">
                        {orders.map(order => (
                            <div key={order.id} className="order-card">
                                <div className="order-header">
                                    <span>Order #{order.order_number}</span>
                                    <span className={`status ${order.financial_status}`}>
                                        {order.financial_status}
                                    </span>
                                </div>
                                <div className="order-details">
                                    <div>Date: {new Date(order.created_at).toLocaleDateString()}</div>
                                    <div>Total: ${order.total_price}</div>
                                    <div>Items: {order.line_items.reduce((sum, item) => sum + item.quantity, 0)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickOrder;