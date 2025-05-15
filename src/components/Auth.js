import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

const Auth = () => {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div>
      {showLogin ? (
        <Login onRegisterClick={() => setShowLogin(false)} />
      ) : (
        <Register onLoginClick={() => setShowLogin(true)} />
      )}
    </div>
  );
};

export default Auth;