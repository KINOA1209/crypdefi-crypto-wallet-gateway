import React, { Fragment } from "react";
import { Link } from "react-router-dom";
import { logout } from "../../actions/auth";
import { useDispatch, useSelector } from "react-redux";

export const Navbar = () => {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const authLinks = (
    <ul>
      <li>
        <a onClick={() => dispatch(logout())} href="/login">
          <i className="fas fa-sign-out-alt" />{" "}
          <span className="hide-sm">Logout</span>
        </a>
      </li>
    </ul>
  );

  const guestLinks = (
    <ul>
      <li>
        <Link to="/register">Register</Link>
      </li>
      <li>
        <Link to="/login">Login</Link>
      </li>
    </ul>
  );

  return (
    <nav className="navbar bg-dark">
      <h1>
        <Link to="/">
          <i className="fas fa-code" /> CrypDefi
        </Link>
      </h1>
      {!auth.loading && (
        <Fragment>{auth.isAuthenticated ? authLinks : guestLinks}</Fragment>
      )}
    </nav>
  );
};
