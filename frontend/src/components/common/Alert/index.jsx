import React from "react";
import { useSelector } from "react-redux";

export const Alert = () => {
  const alerts = useSelector((state) => state.alert);

  return (
    <div className="alert-group">
      {!!alerts &&
        !!alerts.length &&
        alerts.map((alert) => (
          <div key={alert.id} className={`alert alert-${alert.alertType}`}>
            {alert.msg}
          </div>
        ))}
    </div>
  );
};
