import type { Message } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function MyMessage({ msg }: { msg: Message }) {
  const colonIndex = msg.data.indexOf(":");
  const message =
    colonIndex > 0 ? msg.data.substring(colonIndex + 1).trim() : msg.data;
  return (
    <div className="flex justify-end gap-3">
      <div className="flex flex-col items-end max-w-md">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5">
          <p className="text-sm">{message}</p>
        </div>
        <span className="text-xs text-muted-foreground mt-1">
          {msg.date.toLocaleTimeString()}
        </span>
      </div>
      <Avatar className="w-8 h-8">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          ME
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
