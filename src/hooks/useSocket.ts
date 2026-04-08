"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ??
  "http://localhost:3001";

export type ViewingStatusPayload = {
  viewingId: string;
  status: string;
  propertyTitle: string;
};

export type NewMessagePayload = {
  messageId: string;
  fromUserId: string;
  subject: string;
  messageType: string;
  propertyId?: string;
};

interface UseSocketOptions {
  userId: string | undefined;
  onViewingStatusUpdated?: (payload: ViewingStatusPayload) => void;
  onNewMessage?: (payload: NewMessagePayload) => void;
}

/**
 * Connects to the backend Socket.io server and joins the user's private room.
 * Registers event listeners for viewing status updates and new messages.
 * Cleans up on unmount or when userId changes.
 */
export function useSocket({
  userId,
  onViewingStatusUpdated,
  onNewMessage,
}: UseSocketOptions): void {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      auth: { userId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.info(`[Socket] connected as ${userId}`);
    });

    socket.on("disconnect", (reason) => {
      console.info(`[Socket] disconnected — ${reason}`);
    });

    if (onViewingStatusUpdated) {
      socket.on("viewing:status_updated", onViewingStatusUpdated);
    }

    if (onNewMessage) {
      socket.on("message:new", onNewMessage);
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]); // reconnect only if userId changes
}
