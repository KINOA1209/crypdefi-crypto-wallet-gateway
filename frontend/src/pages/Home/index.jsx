import React from "react";
import { useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";

export const Home = () => {
  const auth = useSelector((state) => state.auth);
  if (auth.isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <section className="landing">
      <div className="dark-overlay">
        <div className="landing-inner">
          <h1 className="x-large">Key Management</h1>
          <p className="lead">
            This is a key management platform for EVM chains.
          </p>
          <div className="buttons">
            <Link to="/register" className="btn btn-primary">
              Sign Up
            </Link>
            <Link to="/login" className="btn btn-light">
              Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
