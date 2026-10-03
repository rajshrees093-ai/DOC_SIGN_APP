import { useEffect, useState } from "react";

function Profile({ onLogout }) {
  const [user, setUser] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:5000/api/auth/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        console.log("PROFILE DATA:", data);
        setUser(data);
      })
      .catch(err => console.error(err));
  }, []);

  if (!token) return <p>No token found</p>;

  if (!user) return <p>Loading profile...</p>;

  return (
    <div>
      <h2>Profile</h2>
      <p>User ID: {user.userId}</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

export default Profile;
