"use client";
import { Session } from "next-auth";
import { useEffect, useState, useRef } from "react";
import SockJS from "sockjs-client";
import { Client, IMessage } from "@stomp/stompjs";
import {
    User,
    MoreVertical,
    Pencil,
    FileDown,
    Trash2,
    SendHorizonal,
    Menu,
    X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

let stompClient: Client | null = null;

type Conversation = {
    id: number;
    title: string | null;
    startedAt: string;
};

type Message = {
    sender: "user" | "assistant";
    content: string;
    timestamp?: string;
};

export default function ChatClient({ user }: { user: Session["user"] }) {
    const [connected, setConnected] = useState(false);
    const [conversationId, setConversationId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [userConversations, setUserConversations] = useState<Conversation[]>(
        []
    );

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkScreenWidth();

    window.addEventListener("resize", checkScreenWidth);
    return () => window.removeEventListener("resize", checkScreenWidth);
  }, []);

    useEffect(() => {
        const socket = new SockJS("http://localhost:8080/ws-chat");
        const client = new Client({
            webSocketFactory: () => socket as WebSocket,
            debug: (str) => console.log("[STOMP]", str),
            reconnectDelay: 5000,
        });

        stompClient = client;

        client.onConnect = async () => {
            setConnected(true);

            const res = await fetch("http://localhost:8080/chat/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.email }),
            });

            let data;
            try {
                data = await res.json();
                console.log("✅ Parsed response:", data);
            } catch (err) {
                console.error("❌ Failed to parse JSON:", err);
            }

            setConversationId(data.conversationId);

            const historyRes = await fetch(
                `http://localhost:8080/chat/history?userId=${user.email}&conversationId=${data.conversationId}`
            );

            if (historyRes.ok) {
                let history;
                try {
                    history = await historyRes.json();
                    console.log("✅ Fetched history:", history);
                } catch (err) {
                    console.error("❌ Failed to parse history JSON:", err);
                }
                setMessages(history);
            }

            client.subscribe(
                `/topic/chat/${data.conversationId}`,
                (msg: IMessage) => {
                    const body = JSON.parse(msg.body);
                    setMessages(body);
                    setIsTyping(false);
                }
            );
        };

        client.activate();

        return () => {
            client.deactivate();
        };
    }, []);

    const sendMessage = () => {
        if (!input.trim() || conversationId === null || !stompClient?.connected)
            return;

        const payload = {
            userId: user.id,
            content: input,
            conversationId,
        };

        // Optimistically add user message to chat
        const newMessage: Message = {
            sender: "user",
            content: input,
            timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, newMessage]);

        // Clear input + set typing
        setInput("");
        setIsTyping(true);

        // Send to backend
        stompClient.publish({
            destination: "/app/chat.send",
            body: JSON.stringify(payload),
        });
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const fetchConversations = async () => {
            const res = await fetch(
                `http://localhost:8080/chat/user/${user.email}`
            );
            let data;
            try {
                data = await res.json();
                console.log("✅ Fetched conversations:", data);
            } catch (err) {
                console.error("❌ Failed to parse conversations JSON:", err);
            }
            setUserConversations(data);
            console.log("Fetched conversations:", data);
        };

        if (user?.email) {
            fetchConversations();
        }
    }, [user]);

    const loadConversation = async (conversationId: number) => {
        const res = await fetch(
            `http://localhost:8080/chat/${conversationId}/messages`
        );
        let history;
        try {
            history = await res.json();
            console.log("✅ Fetched conversation history:", history);
        } catch (err) {
            console.error("❌ Failed to parse conversation history JSON:", err);
        }
        setConversationId(conversationId);
        setMessages(history);
    };

    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setOpenMenuId(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const updateTitle = async (id: number) => {
        if (!editTitle.trim()) {
            setEditingId(null); // Exit edit mode without saving
            return;
        }

        await fetch(`http://localhost:8080/chat/${id}/title`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: editTitle }),
        });

        // Refresh list
        const res = await fetch(
            `http://localhost:8080/chat/user/${user.email}`
        );
        const data = await res.json();
        setUserConversations(data);
        setEditingId(null);
    };

    const handleDelete = async (id: number) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this conversation?"
        );
        if (!confirmed) return;

        await fetch(`http://localhost:8080/chat/${id}`, {
            method: "DELETE",
        });

        // Refresh the conversation list
        const res = await fetch(
            `http://localhost:8080/chat/user/${user.email}`
        );
        const data = await res.json();
        setUserConversations(data);

        if (conversationId === id) {
            setConversationId(null);
            setMessages([]);
        }
    };

    const handleExportPdf = async (id: number) => {
        if (!conversationId) return;

        const res = await fetch(
            `http://localhost:8080/chat/${conversationId}/export/pdf`
        );

        if (!res.ok) {
            alert("Failed to generate PDF.");
            return;
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");

        const conv = userConversations.find((c) => c.id === id);
        const sanitizedTitle = (conv?.title || `conversation-${id}`)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        const fileName = `${sanitizedTitle}.pdf`;

        const link = document.createElement("a");
        link.href = url;
        document.body.appendChild(link);
        link.download = fileName;
        link.click();
        link.remove();
    };

    return (
        <main className="h-screen bg-gray-200 flex flex-col md:flex-row">
            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/25 backdrop-blur-sm z-10 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className="fixed top-0 left-0 z-20 w-64 bg-white p-4 overflow-y-auto shadow-md md:relative md:top-0 md:h-full"
                style={{
                  transform: isDesktop ? "none" : (sidebarOpen ? "translateX(0)" : "translateX(-100%)"),
                  transition: "transform 0.3s ease-in-out",
                }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">
                        Your Conversations
                    </h2>
                    <button
                        className="md:hidden text-gray-700"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X />
                    </button>
                </div>
                <ul className="space-y-2">
                    {userConversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={`flex justify-between items-center p-2 rounded hover:bg-gray-100 ${
                                conversationId === conv.id ? "bg-gray-100" : ""
                            }`}
                        >
                            {editingId === conv.id ? (
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) =>
                                        setEditTitle(e.target.value)
                                    }
                                    onBlur={() => updateTitle(conv.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                            updateTitle(conv.id);
                                    }}
                                    autoFocus
                                    className="text-sm border px-2 py-1 rounded w-full"
                                />
                            ) : (
                                <button
                                    className="text-left flex-1 truncate"
                                    onClick={() => {
                                        loadConversation(conv.id);
                                        setSidebarOpen(false); // Hide sidebar on mobile after selection
                                    }}
                                >
                                    {conv.title ||
                                        new Date(
                                            conv.startedAt
                                        ).toLocaleString()}
                                </button>
                            )}

                            <div className="relative">
                                <button
                                    onClick={() =>
                                        setOpenMenuId(
                                            openMenuId === conv.id
                                                ? null
                                                : conv.id
                                        )
                                    }
                                >
                                    <MoreVertical size={18} />
                                </button>
                                {openMenuId === conv.id && (
                                    <div
                                        ref={menuRef}
                                        className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-10"
                                    >
                                        <button
                                            onClick={() => {
                                                setEditingId(conv.id);
                                                setEditTitle(conv.title || "");
                                                setOpenMenuId(null);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                            <Pencil size={16} />
                                            Rename
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleExportPdf(conv.id);
                                                setOpenMenuId(null);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                            <FileDown size={16} />
                                            Export
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleDelete(conv.id);
                                                setOpenMenuId(null);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2"
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </ul>
            </aside>

            {/* Chat Window */}
            <section className="flex-1 flex flex-col items-center justify-center px-2 md:px-4 py-4 md:py-8">
                <div className="w-full max-w-2xl flex flex-col bg-white shadow-md rounded-2xl overflow-hidden h-full">
                    {/* Mobile Toggle Button */}
                    <div className="md:hidden p-2">
                        <button
                            className="text-gray-800"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                        {messages.length > 0 ? (
                            messages.map((msg, index) => {
                                const isUser = msg.sender === "user";
                                return (
                                    <div
                                        key={index}
                                        className={`flex items-start gap-2 ${
                                            isUser
                                                ? "justify-end"
                                                : "justify-start"
                                        }`}
                                    >
                                        {!isUser && (
                                            <img
                                                src="/tripper.png"
                                                alt="Tripper"
                                                className="w-8 h-8 rounded-full"
                                            />
                                        )}
                                        <div
                                            className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                                                isUser
                                                    ? "bg-blue-600 text-white rounded-br-none"
                                                    : "bg-gray-200 text-gray-900 rounded-bl-none"
                                            }`}
                                        >
                                            <div className="prose prose-sm text-sm">
                                                <ReactMarkdown>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                            {msg.timestamp && (
                                                <p className="text-xs text-right opacity-60 mt-1">
                                                    {new Date(
                                                        msg.timestamp
                                                    ).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                        {isUser && (
                                            <div className="p-2 bg-gray-300 rounded-full">
                                                <User className="w-5 h-5 text-gray-800" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-500 text-center mt-12">
                                {conversationId
                                    ? "No messages yet."
                                    : "Select a conversation to view messages."}
                            </p>
                        )}

                        {isTyping && (
                            <div className="flex items-center gap-2">
                                <img
                                    src="/tripper.png"
                                    alt="Tripper"
                                    className="w-8 h-8 rounded-full"
                                />
                                <div className="bg-gray-200 px-4 py-2 rounded-xl text-sm animate-pulse text-gray-800">
                                    Tripper is typing
                                    <span className="animate-bounce">...</span>
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    {conversationId && (
                        <div className="p-4 flex flex-row items-center gap-2">
                            {/* Input takes up leftover space */}
                            <input
                                type="text"
                                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ask Tripper about your trip..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === "Enter" && sendMessage()
                                }
                            />

                            {/* Buttons */}
                            <div className="flex flex-row items-center gap-2 shrink-0">
                                {/* Mobile-only button */}
                                <button
                                    onClick={sendMessage}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition hover:cursor-pointer sm:hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Send"
                                    disabled={!connected}
                                >
                                    <SendHorizonal size={18} />
                                </button>

                                {/* Desktop-only button */}
                                <button
                                    onClick={sendMessage}
                                    className="hidden sm:inline bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!connected}
                                >
                                    Send
                                </button>

                                {/* Export button */}
                                <button
                                    onClick={() =>
                                        handleExportPdf(conversationId)
                                    }
                                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition hover:cursor-pointer flex items-center gap-1"
                                    title="Export conversation as PDF"
                                >
                                    <FileDown size={16} />
                                    <span className="text-sm hidden sm:inline">
                                        Export
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
