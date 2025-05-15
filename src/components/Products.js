import React, { useEffect, useState } from 'react';
import './Products.css';

const Products = ({ customerId }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quantities, setQuantities] = useState({});

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                // Use the API URL with /api prefix
                const apiUrl = 'https://quick-orders-nine.vercel.app/api';
                const response = await fetch(
                    `${apiUrl}/orders?customer_id=${customerId}`,
                    {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Response is not JSON. Received: ' + contentType);
                }
                
                // Get orders and extract products from line items
                const orders = await response.json();
                const extractedProducts = [];
                const uniqueProductIds = new Set();
                
                // Extract all line items from all orders
                orders.forEach(order => {
                    if (order.line_items && order.line_items.length > 0) {
                        order.line_items.forEach(item => {
                            // Only add products that haven't been added yet (based on product_id)
                            if (!uniqueProductIds.has(item.product_id)) {
                                uniqueProductIds.add(item.product_id);
                                
                                // Improved image handling
                                let imageUrl = 'https://via.placeholder.com/150';
                                
                                // Try to get image from different possible locations in the API response
                                if (item.image && item.image.src) {
                                    imageUrl = item.image.src;
                                } else if (item.product_image && item.product_image.src) {
                                    imageUrl = item.product_image.src;
                                } else if (item.properties && item.properties.some(prop => prop.name === '_image_url')) {
                                    const imageProp = item.properties.find(prop => prop.name === '_image_url');
                                    imageUrl = imageProp.value;
                                }
                                
                                extractedProducts.push({
                                    id: item.id,
                                    title: item.title || 'Product',
                                    price: item.price || '0.00',
                                    image: imageUrl,
                                    variant_id: item.variant_id,
                                    product_id: item.product_id
                                });
                            }
                        });
                    }
                });
                
                // Initialize quantities state with default value of 1 for each product
                const initialQuantities = {};
                extractedProducts.forEach(product => {
                    initialQuantities[product.id] = 1;
                });
                setQuantities(initialQuantities);
                
                setProducts(extractedProducts);
            } catch (err) {
                console.error('Error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (customerId) {
            fetchProducts();
        }
    }, [customerId]);

    const handleQuantityChange = (productId, newQuantity) => {
        // Ensure quantity is at least 1
        const quantity = Math.max(1, newQuantity);
        setQuantities(prev => ({
            ...prev,
            [productId]: quantity
        }));
    };

    const handleReorder = async (product) => {
        try {
            // Show loading indicator to user
            alert(`Placing order for ${product.title} (Quantity: ${quantities[product.id]})...`);
            
            // Call the API to create a new order
            const apiUrl = 'https://quick-orders-nine.vercel.app/api';
            const response = await fetch(`${apiUrl}/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer_id: customerId,
                    variant_id: product.variant_id,
                    product_id: product.product_id,
                    quantity: quantities[product.id]
                })
            });
            
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Failed to place order: ${response.status} - ${errorData}`);
            }
            
            const result = await response.json();
            alert(`Order placed successfully! Order #${result.order_number}`);
        } catch (error) {
            console.error('Reorder error:', error);
            alert(`Failed to place order: ${error.message}`);
        }
    };

    return (
        <div className="products-container">
            <h2>Products</h2>
            {loading ? (
                <div className="loading">Loading products...</div>
            ) : error ? (
                <div className="error">Error: {error}</div>
            ) : (
                <div className="product-grid">
                    {products.map(product => (
                        <div key={product.id} className="product-card">
                            <div className="product-image">
                                <img src={product.image} alt={product.title} />
                            </div>
                            <div className="product-info">
                                <h3 className="product-title">{product.title}</h3>
                                <p className="product-price">${product.price}</p>
                                <div className="quantity-control">
                                    <button 
                                        className="quantity-btn"
                                        onClick={() => handleQuantityChange(product.id, quantities[product.id] - 1)}
                                    >
                                        -
                                    </button>
                                    <span className="quantity-display">{quantities[product.id]}</span>
                                    <button 
                                        className="quantity-btn"
                                        onClick={() => handleQuantityChange(product.id, quantities[product.id] + 1)}
                                    >
                                        +
                                    </button>
                                </div>
                                <button 
                                    className="add-to-cart-btn"
                                    onClick={() => handleReorder(product)}
                                >
                                    Reorder
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Products;