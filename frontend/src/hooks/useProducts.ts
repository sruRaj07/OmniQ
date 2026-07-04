/**
 * OmniQ mobile app - product data hook.
 * Author: OmniQ Team
 */
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import type { Product } from "@/types/product.types";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get("/products");
        if (isMounted && response.data?.data) {
          setProducts(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    products,
    isLoading
  };
}

export function useSellerProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchSellerProducts = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get("/products/seller");
        if (isMounted && response.data?.data) {
          setProducts(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch seller products:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSellerProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    products,
    isLoading
  };
}
