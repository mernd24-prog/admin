import React from "react";
import { Route, Redirect } from "react-router-dom";


const PublicRoute = ({ component: Component, ...rest }) => {
  const condition = false; // Define your condition here

  return (
    <Route
      {...rest}
      render={props =>
        condition ? (
          <Redirect to={{ pathname: "/" }} />
        ) : (
          <Component {...props} />
        )
      }
    />
  );
};

export default PublicRoute;
