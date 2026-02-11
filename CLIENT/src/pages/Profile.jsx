import { useEffect, useState } from "react";

function Profile({ onLogout }) {
  const [profileData, setProfileData] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:5000/api/auth/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setProfileData(data);
      })
      .catch(() => {
        alert("Server not reachable");
      });
  }, [token]);

  if (!token) {
    return (
      <div>
        <h2>Profile</h2>
        <p style={{ color: "red" }}>No token found</p>
        <button onClick={onLogout}>Logout</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Profile</h2>
      {profileData ? (
        <pre>{JSON.stringify(profileData, null, 2)}</pre>
      ) : (
        <p>Loading profile...</p>
      )}
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

export default Profile;
