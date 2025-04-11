"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AuthButton() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <div>Loading...</div>;
    }

    if (!session) {
        return <Button onClick={() => signIn("google", { callbackUrl: "/chat" })}>Log In</Button>;
    }

    return (
        <DropdownMenu >
            <DropdownMenuTrigger className="rounded-full focus:outline-none hover:ring-2 hover:ring-sky-600 transition hover:cursor-pointer">
                <Avatar className="w-10 h-10">
                    <AvatarImage
                        src={session.user?.image || ""}
                        alt="Profile"
                        className="object-cover"
                    />
                    <AvatarFallback>
                        {session.user?.name?.[0] ?? "U"}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="hover:cursor-pointer">
                    Log Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
