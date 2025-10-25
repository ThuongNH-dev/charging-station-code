// src/api/userApi.js
import axios from "axios";

const BASE_URL = import.meta.env.DEV ? "/api" : "https://localhost:7268/api";

export const userApi = {
  // === USERS ===
  fetchAllUsers: async () => {
    const res = await axios.get(`${BASE_URL}/Auth`);
    return res.data;
  },

  updateUserStatus: async (id, data) => {
    const res = await axios.put(`${BASE_URL}/Auth/changestatus/${id}`, data);
    return res.data;
  },

  deleteUser: async (id) => {
    const res = await axios.delete(`${BASE_URL}/Auth/${id}`);
    return res.data;
  },

  // === VEHICLES ===
  fetchAllVehicles: async () => {
    const res = await axios.get(`${BASE_URL}/Vehicles?page=1&pageSize=50`);
    return res.data.items || [];
  },

  updateVehicle: async (id, data) => {
    const res = await axios.put(`${BASE_URL}/Vehicles/${id}`, data);
    return res.data;
  },

  deleteVehicle: async (id) => {
    const res = await axios.delete(`${BASE_URL}/Vehicles/${id}`);
    return res.data;
  },

  // === SERVICE PACKAGES ===
  fetchAllServicePackages: async () => {
    const res = await axios.get(`${BASE_URL}/SubscriptionPlans`);
    return res.data;
  },

  updateServicePackage: async (id, data) => {
    const res = await axios.put(`${BASE_URL}/SubscriptionPlans/${id}`, data);
    return res.data;
  },

  deleteServicePackage: async (id) => {
    const res = await axios.delete(`${BASE_URL}/SubscriptionPlans/${id}`);
    return res.data;
  },

  // === SUBSCRIPTIONS ===
  fetchAllSubscriptions: async () => {
    const res = await axios.get(`${BASE_URL}/Subscriptions`);
    return res.data;
  },
};
