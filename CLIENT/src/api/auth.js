import axios from "axios";

const API = axios.create({
  baseURL: "https://doc-sign-app.onrender.com/api/auth",
});

export const loginUser = (data) => API.post("/login", data);
export const registerUser = (data) => API.post("/register", data);
