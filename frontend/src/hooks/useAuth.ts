import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("customerToken");
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customer");
    setIsAuthenticated(false);
    navigate("/customer/login");
  };

  return { isAuthenticated, isLoading, logout };
}

