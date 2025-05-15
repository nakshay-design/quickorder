import React, { useEffect, useState } from 'react';
import './CustomerOrders.css';

const CustomerOrders = ({ customerId }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedOrders, setExpandedOrders] = useState({});
    const [quantities, setQuantities] = useState({});
    const [productVariants, setProductVariants] = useState({});
    const [selectedVariants, setSelectedVariants] = useState({});
    const [loadingVariants, setLoadingVariants] = useState({});

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await fetch(`https://quick-orders-nine.vercel.app/api/orders?customer_id=${customerId}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch orders: ${response.status}`);
                }
                const data = await response.json();
                setOrders(data);
                
                // Initialize quantities for all line items
                const initialQuantities = {};
                const initialSelectedVariants = {};
                data.forEach(order => {
                    if (order.line_items) {
                        order.line_items.forEach(item => {
                            initialQuantities[`${order.id}-${item.id}`] = item.quantity || 1;
                            initialSelectedVariants[`${order.id}-${item.id}`] = item.variant_id;
                        });
                    }
                });
                setQuantities(initialQuantities);
                setSelectedVariants(initialSelectedVariants);
                
            } catch (err) {
                console.error('Error fetching orders:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (customerId) {
            fetchOrders();
        }
    }, [customerId]);

    const toggleOrderExpand = (orderId) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    const handleQuantityChange = (orderId, itemId, newQuantity) => {
        // Allow quantity to be 0 (to exclude item)
        const quantity = Math.max(0, newQuantity);
        setQuantities(prev => ({
            ...prev,
            [`${orderId}-${itemId}`]: quantity
        }));
    };

    const fetchProductVariants = async (orderId, item) => {
        const itemKey = `${orderId}-${item.id}`;
        
        // Don't fetch if we already have the variants
        if (productVariants[item.product_id]) {
            return;
        }
        
        try {
            setLoadingVariants(prev => ({...prev, [itemKey]: true}));
            
            // Fetch variants for this product
            const response = await fetch(`https://quick-orders-nine.vercel.app/api/product-variants?product_id=${item.product_id}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch variants: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Store variants for this product
            setProductVariants(prev => ({
                ...prev,
                [item.product_id]: data.variants || []
            }));
            
        } catch (error) {
            console.error('Error fetching variants:', error);
        } finally {
            setLoadingVariants(prev => ({...prev, [itemKey]: false}));
        }
    };

    const handleVariantChange = (orderId, itemId, productId, variantId) => {
        setSelectedVariants(prev => ({
            ...prev,
            [`${orderId}-${itemId}`]: variantId
        }));
    };

    const handleReorderAll = async (order) => {
        try {
            // Filter out items with quantity 0
            const itemsToReorder = order.line_items.filter(item => 
                quantities[`${order.id}-${item.id}`] > 0
            );
            
            if (itemsToReorder.length === 0) {
                alert('Please select at least one item to reorder.');
                return;
            }
            
            // Show loading indicator to user
            alert(`Reordering ${itemsToReorder.length} items from order #${order.order_number}...`);
            
            // Prepare items with selected variants
            const orderItems = itemsToReorder.map(item => {
                const itemKey = `${order.id}-${item.id}`;
                return {
                    product_id: item.product_id,
                    variant_id: selectedVariants[itemKey] || item.variant_id,
                    quantity: quantities[itemKey]
                };
            });
            
            // Call the API to create a new order with multiple items
            const response = await fetch('https://quick-orders-nine.vercel.app/api/create-order-bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer_id: customerId,
                    items: orderItems
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to place order: ${response.status}`);
            }
            
            const result = await response.json();
            alert(`Order placed successfully! Order #${result.order_number}`);
        } catch (error) {
            console.error('Reorder error:', error);
            alert(`Failed to place order: ${error.message}`);
        }
    };

    const handleReorderItem = async (order, item) => {
        try {
            const itemKey = `${order.id}-${item.id}`;
            const quantity = quantities[itemKey];
            const variantId = selectedVariants[itemKey] || item.variant_id;
            
            if (quantity <= 0) {
                alert('Please set a quantity greater than 0 to reorder this item.');
                return;
            }
            
            // Show loading indicator to user
            alert(`Reordering ${item.title} (Quantity: ${quantity})...`);
            
            // Call the API to create a new order
            const response = await fetch('https://quick-orders-nine.vercel.app/api/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer_id: customerId,
                    variant_id: variantId,
                    product_id: item.product_id,
                    quantity: quantity
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to place order: ${response.status}`);
            }
            
            const result = await response.json();
            alert(`Order placed successfully! Order #${result.order_number}`);
        } catch (error) {
            console.error('Reorder error:', error);
            alert(`Failed to place order: ${error.message}`);
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading) {
        return <div className="loading">Loading orders...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    return (
        <div className="customer-orders-container">
            <h2>Your Orders</h2>
            
            {orders.length === 0 ? (
                <div className="no-orders">You haven't placed any orders yet.</div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => (
                        <div key={order.id} className="order-item">
                            <div 
                                className="order-header" 
                                onClick={() => toggleOrderExpand(order.id)}
                            >
                                <div className="order-summary">
                                    <div className="order-number">
                                        <span>Order #{order.order_number}</span>
                                        <span className={`status ${order.financial_status}`}>
                                            {order.financial_status}
                                        </span>
                                    </div>
                                    <div className="order-meta">
                                        <span>Date: {formatDate(order.created_at)}</span>
                                        <span>Total: ${order.total_price}</span>
                                        <span>Items: {order.line_items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                                    </div>
                                </div>
                                <div className="toggle-icon">
                                    {expandedOrders[order.id] ? '▼' : '►'}
                                </div>
                            </div>
                            
                            {expandedOrders[order.id] && (
                                <div className="order-details">
                                    <div className="reorder-all-container">
                                        <button 
                                            className="reorder-all-btn"
                                            onClick={() => handleReorderAll(order)}
                                        >
                                            Reorder Selected Items
                                        </button>
                                        <p className="reorder-note">Set quantity to 0 to exclude items</p>
                                    </div>
                                    <div className="line-items">
                                        {order.line_items.map(item => {
                                            const itemKey = `${order.id}-${item.id}`;
                                            const quantity = quantities[itemKey];
                                            const isExcluded = quantity === 0;
                                            
                                            // Fetch variants when expanded
                                            if (expandedOrders[order.id] && !productVariants[item.product_id] && !loadingVariants[itemKey]) {
                                                fetchProductVariants(order.id, item);
                                            }
                                            
                                            // Get variants for this product
                                            const variants = productVariants[item.product_id] || [];
                                            const hasVariants = variants.length > 1;
                                            
                                            return (
                                                <div 
                                                    key={item.id} 
                                                    className={`line-item ${isExcluded ? 'excluded' : ''}`}
                                                >
                                                    <div className="item-image">
                                                        {item.image ? (
                                                            <img src={item.image.src} alt={item.title} />
                                                        ) : (
                                                            <div className="no-image">No Image</div>
                                                        )}
                                                    </div>
                                                    <div className="item-details">
                                                        <h4>{item.title}</h4>
                                                        <p>Price: ${item.price}</p>
                                                        <p>Original Quantity: {item.quantity}</p>
                                                        
                                                        {/* Variant selection */}
                                                        {loadingVariants[itemKey] ? (
                                                            <p className="loading-variants">Loading variants...</p>
                                                        ) : hasVariants ? (
                                                            <div className="variant-selection">
                                                                <label htmlFor={`variant-${itemKey}`}>Variant:</label>
                                                                <select 
                                                                    id={`variant-${itemKey}`}
                                                                    value={selectedVariants[itemKey] || item.variant_id}
                                                                    onChange={(e) => handleVariantChange(
                                                                        order.id, 
                                                                        item.id, 
                                                                        item.product_id,
                                                                        e.target.value
                                                                    )}
                                                                    disabled={isExcluded}
                                                                >
                                                                    {variants.map(variant => (
                                                                        <option key={variant.id} value={variant.id}>
                                                                            {variant.title} - ${variant.price}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <p>Variant: {item.variant_title || 'Default'}</p>
                                                        )}
                                                        
                                                        {isExcluded && (
                                                            <p className="excluded-label">Excluded from reorder</p>
                                                        )}
                                                    </div>
                                                    <div className="item-actions">
                                                        <div className="quantity-control">
                                                            <button 
                                                                className="quantity-btn"
                                                                onClick={() => handleQuantityChange(
                                                                    order.id, 
                                                                    item.id, 
                                                                    quantity - 1
                                                                )}
                                                            >
                                                                -
                                                            </button>
                                                            <span className="quantity-display">
                                                                {quantity}
                                                            </span>
                                                            <button 
                                                                className="quantity-btn"
                                                                onClick={() => handleQuantityChange(
                                                                    order.id, 
                                                                    item.id, 
                                                                    quantity + 1
                                                                )}
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                        <button 
                                                            className="reorder-btn"
                                                            onClick={() => handleReorderItem(order, item)}
                                                            disabled={isExcluded}
                                                        >
                                                            {isExcluded ? 'Excluded' : 'Reorder'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomerOrders;