import React, { useState, useEffect } from 'react';
import QuickOrder from './components/QuickOrder';
import CustomerOrders from './components/CustomerOrders';
import Products from './components/Products';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  const [activePage, setActivePage] = useState('products');
  const [customerId, setCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if customer is logged in
    const checkCustomerLogin = async () => {
      try {
        // Check if we have a customer_id in URL params (from Shopify)
        const urlParams = new URLSearchParams(window.location.search);
        const customerIdFromUrl = urlParams.get('customer_id');
        
        // Check if we have a stored customer ID in localStorage
        const storedCustomerId = localStorage.getItem('quickorder_customer_id');
        
        // If we have a customer_id in URL, use it and store it
        if (customerIdFromUrl) {
          setCustomerId(customerIdFromUrl);
          localStorage.setItem('quickorder_customer_id', customerIdFromUrl);
          // Remove the customer_id from URL to clean it up (optional)
          window.history.replaceState({}, document.title, window.location.pathname);
          setLoading(false);
          return;
        }
        
        // If we have a stored customer ID, use it
        if (storedCustomerId) {
          setCustomerId(storedCustomerId);
          setLoading(false);
          return;
        }
        
        // If no customer ID in URL or localStorage, redirect back to Shopify
        window.location.href = 'https://1account.myshopify.com/pages/quick-order';
      } catch (error) {
        console.error('Error checking customer login:', error);
        setLoading(false);
      }
    };
    
    checkCustomerLogin();
  }, []);
  
  const handleNavigate = (page) => {
    setActivePage(page);
  };
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <div className="App">
      <Navigation activePage={activePage} onNavigate={handleNavigate} />
      
      <div className="user-info">
        <span>Customer ID: {customerId}</span>
      </div>
      
      <div className="page-content">
        {activePage === 'home' && <QuickOrder customerId={customerId} />}
        {activePage === 'orders' && <CustomerOrders customerId={customerId} />}
        {activePage === 'products' && <Products customerId={customerId} />}
      </div>
    </div>
  );
}

export default App;
// For development/testing purposes, you can use a static customer ID
// Remove this in production when you have proper authentication
const useStaticCustomerId = true; // Set to false in production
const apiUrl = process.env.REACT_APP_API_URL || 'https://quick-orders-nine.vercel.app';
