"use client";

import { useEffect, useState } from "react";
import { OrderType } from "@repo/types";
import { SignInButton, useAuth } from "@clerk/nextjs";

const OrdersPage = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [orders, setOrders] = useState<OrderType[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing Clerk auth token.");
        }

        console.log("[client] order token", token);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_ORDER_SERVICE_URL}/user-orders`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        const data = await res.json();
        console.log("[client] order response", res.status, data);
        if (!res.ok) {
          throw new Error(data?.message ?? "Unable to fetch orders.");
        }

        if (!Array.isArray(data)) {
          throw new Error("Unexpected orders response payload.");
        }

        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };

    if (!isLoaded) {
      return;
    }

    if (isSignedIn) {
      fetchOrders();
    } else {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  if (isLoading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl my-4 font-medium">Your Orders</h1>
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="p-4">
        <h1 className="text-2xl my-4 font-medium">Your Orders</h1>
        <p className="mb-4">Please sign in to view your orders.</p>
        <SignInButton>
          <button className="rounded-md bg-black px-4 py-2 text-white">
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-2xl my-4 font-medium">Your Orders</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-2xl my-4 font-medium">Your Orders</h1>
        <p>No orders found.</p>
      </div>
    );
  }

  return (
    <div className="">
      <h1 className="text-2xl my-4 font-medium">Your Orders</h1>
      <ul>
        {orders.map((order) => (
          <li key={order._id} className="flex items-center mb-4">
            <div className="w-1/4">
              <span className="font-medium text-sm text-gray-500">
                Order ID
              </span>
              <p>{order._id}</p>
            </div>
            <div className="w-1/12">
              <span className="font-medium text-sm text-gray-500">Total</span>
              <p>{order.amount / 100}</p>
            </div>
            <div className="w-1/12">
              <span className="font-medium text-sm text-gray-500">Status</span>
              <p>{order.status}</p>
            </div>
            <div className="w-1/8">
              <span className="font-medium text-sm text-gray-500">Date</span>
              <p>
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString("en-US")
                  : "-"}
              </p>
            </div>
            <div className="">
              <span className="font-medium text-sm text-gray-500">
                Products
              </span>
              <p>{order.products?.map((product) => product.name).join(", ") || "-"}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OrdersPage;
