"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Phone, Video, ArrowLeft, MoreVertical } from "lucide-react";
import { toast } from "sonner";

interface Message {
    id: string;
    sender: "me" | "them";
    content: string;
    time: string;
}

export default function DoctorChatPage() {
    const params = useParams();
    const router = useRouter();
    const supabase = createClient();
    const [doctor, setDoctor] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([
        { id: "1", sender: "them", content: "Hello! checking in regarding the schedule.", time: "09:41 AM" },
        { id: "2", sender: "me", content: "Hi Doctor, yes I have updated it.", time: "09:42 AM" },
    ]);
    const [input, setInput] = useState("");

    useEffect(() => {
        const fetchDoctor = async () => {
            try {
                const { data, error } = await supabase
                    .from("doctors")
                    .select("*")
                    .eq("id", params.doctorId)
                    .single();

                if (error) throw error;
                setDoctor(data);
            } catch (error) {
                console.error("Error fetching doctor:", error);
                toast.error("Could not load doctor details");
            } finally {
                setLoading(false);
            }
        };

        if (params.doctorId) {
            fetchDoctor();
        }
    }, [params.doctorId]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            sender: "me",
            content: input,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages([...messages, newMessage]);
        setInput("");

        // Simulate reply
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: "them",
                content: "Thanks! I'll take a look.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }, 2000);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading chat...</div>;
    if (!doctor) return <div className="p-8 text-center text-gray-500">Doctor not found</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] bg-white dark:bg-gray-800 lg:rounded-2xl lg:border lg:border-[#e6f3f4] dark:lg:border-gray-700 shadow-sm overflow-hidden m-4 lg:m-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6f3f4] dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="lg:hidden">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="relative">
                        <div className="h-10 w-10 border border-gray-100 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
                            {doctor.photo_url ? (
                                <img src={doctor.photo_url} alt={doctor.name} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-primary font-bold text-lg">{doctor.name[0]}</span>
                            )}
                        </div>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white leading-none">{doctor.name}</h3>
                        <p className="text-xs text-primary font-medium mt-1">{doctor.specialization}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                    <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/5">
                        <Phone className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/5">
                        <Video className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/5">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto">
                <div className="space-y-4 max-w-3xl mx-auto">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${msg.sender === "me"
                                        ? "bg-primary text-white rounded-br-none"
                                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none"
                                    }`}
                            >
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                <p
                                    className={`text-[10px] mt-1 text-right ${msg.sender === "me" ? "text-primary-foreground/70" : "text-gray-400"
                                        }`}
                                >
                                    {msg.time}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-[#e6f3f4] dark:border-gray-700">
                <form onSubmit={handleSend} className="flex items-center gap-3 max-w-3xl mx-auto">
                    <Input
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-primary/20"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim()}
                        className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                        <Send className="h-4 w-4 ml-0.5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
