"use client";

import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
                <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0c1b1d] dark:text-white">Messages</h2>
            <p className="text-gray-500 max-w-sm mt-2">
                Select a doctor from the dashboard to start a conversation or view their messages.
            </p>
        </div>
    );
}
