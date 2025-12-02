import type { Message } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ChatBubble from "./chat-bubble";

export default function OtherMessage({ msg }: { msg: Message }) {
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  // Extract name and message
  const colonIndex = msg.data.indexOf(":");
  const name = colonIndex > 0 ? msg.data.substring(0, colonIndex) : "User";
  const message =
    colonIndex > 0 ? msg.data.substring(colonIndex + 1).trim() : msg.data;

  return (
    <div className="flex justify-start gap-3">
      <Avatar className="w-8 h-8">
        <AvatarFallback className="bg-muted text-xs">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col max-w-md">
        <span className="text-xs font-medium text-muted-foreground mb-1">
          {name}
        </span>
        <ChatBubble message={message} isSentByMe={false} />
        <span className="text-xs text-muted-foreground mt-1">
          {msg.date.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
