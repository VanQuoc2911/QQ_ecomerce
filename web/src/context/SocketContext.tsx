import { createContext, useEffect, useRef, type ReactNode } from "react";
import { toast } from "react-toastify";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SellerRequestApprovedData {
  requestId: string;
  message: string;
  ts: number;
}

interface ProductApprovedData {
  productId: string;
  title: string;
  message: string;
  ts: number;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export { SocketContext };

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        connectedRef.current = false;
      }
      return;
    }

    // Connect to socket.io server
    const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:4000";
    socketRef.current = io(apiBase, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      connectedRef.current = true;

      // Join user's room to receive notifications
      if (user?.id || user?._id) {
        // join both personal room and seller room for backwards compatibility
        socket.emit("joinUserRoom", { userId: user.id || user._id });
        socket.emit("joinSellerRoom", { userId: user.id || user._id });
      }
    });

    // Listen for seller request approval notification
    socket.on("sellerRequest:approved", (data: SellerRequestApprovedData) => {
      toast.success(data.message || "Your seller request has been approved!");
      // Refresh user profile to get updated role and seller status
      refreshUser();
      // Also dispatch custom event for other listeners
      window.dispatchEvent(new CustomEvent("sellerRequestApproved", { detail: data }));
    });

    // Listen for product approval notification
    socket.on("product:approved", (data: ProductApprovedData) => {
      toast.success(data.message || "Your product has been approved!");
      window.dispatchEvent(new CustomEvent("productApproved", { detail: data }));
    });

    // Listen for new orders created that concern this seller
    socket.on("order:created", (data: { orderId: string; sellerId: string; message?: string }) => {
      // Notify seller briefly and trigger a refresh in seller pages
      toast.info(data.message || "Bạn có đơn hàng mới");
      window.dispatchEvent(new CustomEvent("orderPlaced", { detail: data }));
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      connectedRef.current = false;
    });

    socket.on("error", (err: Error | string) => {
      console.error("Socket error:", err);
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
        connectedRef.current = false;
      }
    };
  }, [user, refreshUser]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected: connectedRef.current }}>
      {children}
    </SocketContext.Provider>
  );
}
