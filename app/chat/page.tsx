
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChatClient from "@/components/ChatClient";



export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return <ChatClient user={session.user} />;
}
