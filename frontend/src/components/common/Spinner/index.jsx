import React, { Fragment } from "react";
import spinner from "./img/spinner.gif";

// eslint-disable-next-line import/no-anonymous-default-export
export const Spinner = () => (
  <Fragment>
    <img src={spinner} className="spinner" alt="Loading..." />
  </Fragment>
);
