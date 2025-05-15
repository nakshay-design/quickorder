require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Add this

const app = express();
app.use(cors({ 
  origin: process.env.CLIENT_URL || 'https://quick-orders-nine.vercel.app',
  credentials: true // Important for cookies
})); 
app.use(cookieParser()); // Add this
app.use(express.json());

const PORT = process.env.PORT || 3002;

// Private app credentials for single store
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_PASSWORD = process.env.SHOPIFY_PASSWORD;
const SHOP_NAME = '1account'; // Your store name without .myshopify.com

// Add this before the /orders endpoint
app.get('/api/test', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({ status: 'Server is working', time: new Date() });
});

app.get('/api/orders', async (req, res) => {
    try {
        const customerId = req.query.customer_id;
        
        // Ensure customer ID is provided for security
        if (!customerId) {
            return res.status(400).json({ 
                error: 'Customer ID is required'
            });
        }
        
        let url = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/orders.json?customer_id=${customerId}&status=any`;

        const response = await axios.get(url, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
                'Content-Type': 'application/json'
            }
        });
        
        // Process orders to include necessary product details
        const orders = response.data.orders.map(order => {
            // Ensure line_items have images
            if (order.line_items) {
                order.line_items = order.line_items.map(item => {
                    // If no image, add a placeholder
                    if (!item.image) {
                        item.image = {
                            src: 'https://via.placeholder.com/150'
                        };
                    }
                    return item;
                });
            }
            return order;
        });
        
        res.setHeader('Content-Type', 'application/json');
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch orders',
            details: error.response?.data || error.message
        });
    }
});

// Add new endpoint to create a new order for a single product
app.post('/api/create-order', async (req, res) => {
    try {
        const { customer_id, variant_id, product_id, quantity } = req.body;
        
        // Ensure required fields are provided
        if (!customer_id || !variant_id) {
            return res.status(400).json({ 
                error: 'Customer ID and Variant ID are required'
            });
        }
        
        // Create a new order in Shopify
        const url = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/orders.json`;
        
        const orderData = {
            order: {
                customer: { id: customer_id },
                line_items: [
                    {
                        variant_id: variant_id,
                        quantity: quantity || 1
                    }
                ],
                financial_status: "pending"
            }
        };
        
        console.log('Creating order with data:', JSON.stringify(orderData));
        
        const response = await axios.post(url, orderData, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
                'Content-Type': 'application/json'
            }
        });
        
        res.json(response.data.order);
    } catch (error) {
        console.error('Error creating order:', error.response?.data || error.message);
        
        // Provide more detailed error information
        let errorMessage = 'Failed to create order';
        let errorDetails = error.message;
        
        if (error.response) {
            errorMessage += `: ${error.response.status}`;
            errorDetails = JSON.stringify(error.response.data);
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: errorDetails
        });
    }
});

// Add new endpoint to reorder an entire previous order
app.post('/api/reorder', async (req, res) => {
    try {
        const { customer_id, order_id } = req.body;
        
        // Ensure required fields are provided
        if (!customer_id || !order_id) {
            return res.status(400).json({ 
                error: 'Customer ID and Order ID are required'
            });
        }
        
        // First, get the original order to extract line items
        const getOrderUrl = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/orders/${order_id}.json`;
        const orderResponse = await axios.get(getOrderUrl, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
                'Content-Type': 'application/json'
            }
        });
        
        const originalOrder = orderResponse.data.order;
        
        // Extract line items from the original order
        const lineItems = originalOrder.line_items.map(item => ({
            variant_id: item.variant_id,
            quantity: item.quantity
        }));
        
        // Create a new order with the same line items
        const createOrderUrl = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/orders.json`;
        const newOrderData = {
            order: {
                customer: { id: customer_id },
                line_items: lineItems,
                financial_status: "pending"
            }
        };
        
        const createResponse = await axios.post(createOrderUrl, newOrderData, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
                'Content-Type': 'application/json'
            }
        });
        
        res.json(createResponse.data.order);
    } catch (error) {
        console.error('Error reordering:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to reorder',
            details: error.response?.data || error.message
        });
    }
});

// Customer login endpoint
app.post('/api/customer-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Search for customer in Shopify
    const searchUrl = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(email)}`;
    
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
        'Content-Type': 'application/json'
      }
    });
    
    const customers = searchResponse.data.customers;
    
    if (customers.length === 0) {
      return res.status(401).json({ error: 'No account found with this email' });
    }
    
    // In a real app, you would verify the password hash
    // For this example, we're just checking if the customer exists
    // IMPORTANT: In production, implement proper password verification!
    
    const customer = customers[0];
    
    // Return customer data
    res.json({
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email
    });
    
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Login failed',
      details: error.response?.data || error.message
    });
  }
});

// Customer registration endpoint
app.post('/api/customer-register', async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;
    
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if customer already exists
    const searchUrl = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(email)}`;
    
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
        'Content-Type': 'application/json'
      }
    });
    
    if (searchResponse.data.customers.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }
    
    // Create new customer in Shopify
    const createUrl = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/customers.json`;
    
    const customerData = {
      customer: {
        first_name,
        last_name,
        email,
        verified_email: true,
        password,
        password_confirmation: password,
        send_email_welcome: false
      }
    };
    
    const createResponse = await axios.post(createUrl, customerData, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
        'Content-Type': 'application/json'
      }
    });
    
    const newCustomer = createResponse.data.customer;
    
    // Return the new customer data
    res.status(201).json({
      id: newCustomer.id,
      first_name: newCustomer.first_name,
      last_name: newCustomer.last_name,
      email: newCustomer.email
    });
    
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Registration failed',
      details: error.response?.data || error.message
    });
  }
});

// Add nodemailer for sending emails
const nodemailer = require('nodemailer');

// In-memory store for verification codes (in production, use a database)
const verificationCodes = {};

// Configure email transporter (replace with your SMTP settings)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Generate a random 6-digit code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Add these required packages at the top
const crypto = require('crypto');

// Add Multipass endpoint
app.post('/api/multipass-login', async (req, res) => {
  try {
    const { email, first_name, last_name, return_to } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const MULTIPASS_SECRET = process.env.SHOPIFY_MULTIPASS_SECRET;
    
    if (!MULTIPASS_SECRET) {
      return res.status(500).json({ error: 'Multipass secret is not configured' });
    }
    
    // Create customer data object
    const customerData = {
      email: email,
      created_at: new Date().toISOString(),
      first_name: first_name || '',
      last_name: last_name || '',
      return_to: return_to || ''
    };
    
    // Encrypt the customer data
    const customerDataJSON = JSON.stringify(customerData);
    
    // Create encryption key from secret
    const encryptionKey = crypto
      .createHash('sha256')
      .update(MULTIPASS_SECRET)
      .digest();
    
    // Create signature key from secret
    const signatureKey = crypto
      .createHash('sha256')
      .update(MULTIPASS_SECRET)
      .update('signature')
      .digest();
    
    // Generate random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Encrypt the customer data
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    let encrypted = cipher.update(customerDataJSON, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Create signature (HMAC) of the encrypted data with the IV
    const hmac = crypto.createHmac('sha256', signatureKey);
    hmac.update(iv);
    hmac.update(encrypted);
    const signature = hmac.digest('base64');
    
    // Combine the IV, encrypted data, and signature
    const token = Buffer.from(JSON.stringify({
      iv: iv.toString('base64'),
      data: encrypted,
      signature: signature
    })).toString('base64');
    
    // Generate the Multipass URL
    const multipassURL = `https://${SHOP_NAME}.myshopify.com/account/login/multipass/${token}`;
    
    res.json({ multipass_url: multipassURL });
  } catch (error) {
    console.error('Multipass error:', error);
    res.status(500).json({ 
      error: 'Failed to generate Multipass URL',
      details: error.message
    });
  }
});

// Get customer data from Shopify session
app.get('/api/get-customer', async (req, res) => {
  try {
    // Get the customer token from the request
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    // Verify the token with Shopify (implementation depends on your auth method)
    // For App Bridge, you'd verify the JWT
    // For Multipass, you'd decode the customer data
    
    // For this example, we'll assume we've verified and have the customer ID
    const customerId = '8824357683493'; // Replace with actual verification logic
    
    // Return the customer ID
    res.json({ customerId });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Verify code for login
app.post('/api/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }
    
    // Check if verification code exists and is valid
    const verification = verificationCodes[email];
    if (!verification) {
      return res.status(401).json({ error: 'No verification code found for this email' });
    }
    
    // Check if code is expired (10 minutes)
    if (Date.now() - verification.timestamp > 10 * 60 * 1000) {
      delete verificationCodes[email];
      return res.status(401).json({ error: 'Verification code has expired' });
    }
    
    // Check if code matches
    if (verification.code !== code) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }
    
    // Code is valid, return customer data
    const userData = {
      id: verification.customerId,
      first_name: verification.firstName,
      last_name: verification.lastName,
      email: email
    };
    
    // Remove the used verification code
    delete verificationCodes[email];
    
    res.json(userData);
    
  } catch (error) {
    console.error('Error verifying code:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to verify code',
      details: error.response?.data || error.message
    });
  }
});

// Verify code for registration
app.post('/api/verify-registration', async (req, res) => {
  try {
    const { email, code, first_name, last_name } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }
    
    // Check if verification code exists and is valid
    const verification = verificationCodes[email];
    if (!verification || !verification.isRegistration) {
      return res.status(401).json({ error: 'No registration verification code found for this email' });
    }
    
    // Check if code is expired (10 minutes)
    if (Date.now() - verification.timestamp > 10 * 60 * 1000) {
      delete verificationCodes[email];
      return res.status(401).json({ error: 'Verification code has expired' });
    }
    
    // Check if code matches
    if (verification.code !== code) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }
    
    // Code is valid, create new customer in Shopify
    const createUrl = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/customers.json`;
    
    // Generate a random password since we're not using passwords
    const randomPassword = Math.random().toString(36).slice(-10);
    
    const customerData = {
      customer: {
        first_name: first_name || verification.firstName,
        last_name: last_name || verification.lastName,
        email: email,
        verified_email: true,
        password: randomPassword,
        password_confirmation: randomPassword,
        send_email_welcome: false
      }
    };
    
    const createResponse = await axios.post(createUrl, customerData, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
        'Content-Type': 'application/json'
      }
    });
    
    const newCustomer = createResponse.data.customer;
    
    // Remove the used verification code
    delete verificationCodes[email];
    
    // Return the new customer data
    res.status(201).json({
      id: newCustomer.id,
      first_name: newCustomer.first_name,
      last_name: newCustomer.last_name,
      email: newCustomer.email
    });
    
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Registration failed',
      details: error.response?.data || error.message
    });
  }
});

// OAuth callback endpoint
app.post('/api/auth/callback', async (req, res) => {
  try {
    const { code, shop } = req.body;
    
    if (!code || !shop) {
      return res.status(400).json({ error: 'Code and shop are required' });
    }
    
    // Exchange the authorization code for an access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const tokenResponse = await axios.post(tokenUrl, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code
    });
    
    const accessToken = tokenResponse.data.access_token;
    
    // Get customer data using the access token
    const customerUrl = `https://${shop}/admin/api/2024-01/customers/current.json`;
    const customerResponse = await axios.get(customerUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });
    
    const customer = customerResponse.data.customer;
    
    res.json({
      accessToken,
      customer
    });
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Authentication failed',
      details: error.response?.data || error.message
    });
  }
});

// Validate token endpoint
app.get('/api/validate-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Validate the token with Shopify
    const validateUrl = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/shop.json`;
    await axios.get(validateUrl, {
      headers: {
        'X-Shopify-Access-Token': token
      }
    });
    
    // If no error was thrown, the token is valid
    res.json({ valid: true });
  } catch (error) {
    console.error('Token validation error:', error.response?.data || error.message);
    res.status(401).json({ 
      error: 'Invalid token',
      details: error.response?.data || error.message
    });
  }
});

// Endpoint to get current customer
app.get('/api/current-customer', async (req, res) => {
  try {
    // In a real implementation, you would verify the customer's session/token
    // For now, we'll check for a customer_id in the query parameters or cookies
    const customerId = req.query.customer_id || req.cookies?.customer_id;
    
    if (!customerId) {
      return res.status(401).json({ error: 'Customer not logged in' });
    }
    
    // Fetch customer details from Shopify
    const url = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/customers/${customerId}.json`;
    
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
        'Content-Type': 'application/json'
      }
    });
    
    const customer = response.data.customer;
    
    res.json({
      customerId: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email
    });
  } catch (error) {
    console.error('Error fetching customer:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch customer',
      details: error.response?.data || error.message
    });
  }
});

// Shopify Auth Redirect Endpoint
app.get('/api/auth-redirect', async (req, res) => {
  try {
    // Get the return_to URL and customer_id from query params
    const { return_to, id_token } = req.query;
    
    if (!return_to) {
      return res.status(400).send('Missing return_to parameter');
    }
    
    // Get customer data from Shopify based on the token
    // This is a simplified example - in production you'd validate the token
    // and extract customer information from it
    let customerId;
    
    try {
      // Parse the JWT token to get customer info
      // In a real implementation, you would verify the token signature
      const tokenParts = id_token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        customerId = payload.customer_id;
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
    
    if (!customerId) {
      // If we couldn't get the customer ID from the token, try to get it from the checkout URL
      // This is a fallback method
      const checkoutUrl = req.query.checkout_url;
      if (checkoutUrl) {
        // Extract customer ID from checkout URL if available
        const checkoutParams = new URL(checkoutUrl).searchParams;
        customerId = checkoutParams.get('customer_id');
      }
    }
    
    if (!customerId) {
      return res.status(401).send('Authentication failed: Unable to identify customer');
    }
    
    // Create a session for the customer
    // In a real implementation, you would use a proper session management system
    // For this example, we'll use a simple cookie
    res.cookie('shopify_customer_id', customerId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Redirect back to the app with the customer ID
    // In production, you might not want to include the ID in the URL for security reasons
    // Instead, the client would fetch it from an API endpoint using the session cookie
    res.redirect(`${return_to}?customer_id=${customerId}`);
  } catch (error) {
    console.error('Auth redirect error:', error);
    res.status(500).send('Authentication error');
  }
});

// Add an endpoint to get the current customer from the session
app.get('/api/current-customer', (req, res) => {
  // Get customer ID from cookie
  const customerId = req.cookies?.shopify_customer_id;
  
  if (!customerId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // In a real implementation, you might want to validate that this customer still exists
  // by making a request to the Shopify API
  res.json({ customerId });
});

// Add a logout endpoint
app.post('/api/logout', (req, res) => {
  res.clearCookie('shopify_customer_id');
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Add endpoint to fetch product variants
app.get('/api/product-variants', async (req, res) => {
    try {
        const productId = req.query.product_id;
        
        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        
        // Fetch product variants from Shopify
        const url = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/products/${productId}/variants.json`;
        
        const response = await axios.get(url, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({ variants: response.data.variants });
    } catch (error) {
        console.error('Error fetching product variants:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch product variants',
            details: error.response?.data || error.message
        });
    }
});

// Add new endpoint to create a new order with multiple items
app.post('/api/create-order-bulk', async (req, res) => {
    try {
        const { customer_id, items } = req.body;
        
        // Ensure required fields are provided
        if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                error: 'Customer ID and at least one item are required'
            });
        }
        
        // Create a new order in Shopify
        const url = `https://${SHOP_NAME}.myshopify.com/admin/api/2024-01/orders.json`;
        
        // Format line items for the order
        const lineItems = items.map(item => ({
            variant_id: item.variant_id,
            quantity: item.quantity || 1
        }));
        
        const orderData = {
            order: {
                customer: { id: customer_id },
                line_items: lineItems,
                financial_status: "pending"
            }
        };
        
        console.log('Creating bulk order with data:', JSON.stringify(orderData));
        
        const response = await axios.post(url, orderData, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_PASSWORD,
                'Content-Type': 'application/json'
            }
        });
        
        res.json(response.data.order);
    } catch (error) {
        console.error('Error creating bulk order:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to create order',
            details: error.response?.data || error.message
        });
    }
});