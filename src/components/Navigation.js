import React from 'react';
import './Navigation.css';

const Navigation = ({ activePage, onNavigate }) => {
    return (
        <nav className="main-navigation">
            <div className="nav-container">
                <div className="logo">Quick Order</div>
                <ul className="nav-links">
                    <li className={activePage === 'home' ? 'active' : ''}>
                        <button onClick={() => onNavigate('home')}>Home</button>
                    </li>
                    <li className={activePage === 'products' ? 'active' : ''}>
                        <button onClick={() => onNavigate('products')}>Products</button>
                    </li>
                    <li className={activePage === 'orders' ? 'active' : ''}>
                        <button onClick={() => onNavigate('orders')}>Orders</button>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Navigation;