import { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export function useWebSocket() {
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace("http://", "https://");
        const socket = new SockJS(`${baseURL}/ws-chat`);

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
