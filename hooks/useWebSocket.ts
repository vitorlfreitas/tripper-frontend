import { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

/**
 * Custom hook to manage WebSocket connection using SockJS and STOMP.
 * @returns {Object} - Contains the stompClient instance and connection status.
 */
export function useWebSocket() {
    // State to hold the STOMP client and connection status
    const [stompClient, setStompClient] = useState<Client | null>(null);
    // State to track connection status
    const [connected, setConnected] = useState(false);

    // Effect to establish WebSocket connection on component mount
    useEffect(() => {

        // Check if the environment variable is defined
        const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace("http://", "https://");
        
        const socket = new SockJS(`${baseURL}/ws-chat`);

        // Check if the socket is open
        const client = new Client({
            webSocketFactory: () => socket as WebSocket,
            debug: (str) => console.log("[STOMP]", str),
            reconnectDelay: 5000,
        });

        
        client.onConnect = () => {
            setConnected(true);
            console.log("✅ WebSocket connected");
        };

        client.activate();
        setStompClient(client);

        return () => {
            client.deactivate();
            setConnected(false);
            console.log("❌ WebSocket disconnected");
        };
    }, []);

    return { stompClient, connected };
}
