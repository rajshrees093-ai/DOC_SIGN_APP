import React from "react";

function Profile({ onLogout }) {
  const token = localStorage.getItem("token");

  return (
    <div>
      <h2>Profile</h2>

      {token ? (
        <p style={{ color: "green" }}>Logged in ✅</p>
      ) : (
        <p style={{ color: "red" }}>No token found</p>
      )}

      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

export default Profile;
