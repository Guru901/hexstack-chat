import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Send, Users, LogOut, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Message type definition
type Message = {
  text: string;
  timestamp: Date;
  system?: boolean;
};

// Allow for ws to be null or WebSocket
const ChatApp = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [needsName, setNeedsName] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const websocket = new WebSocket("ws://167.71.158.242:3000/");

    websocket.onopen = () => {
      setConnected(true);
    };

    websocket.onmessage = (event: MessageEvent) => {
      const msg = event.data;
      setMessages((prev) => [...prev, { text: msg, timestamp: new Date() }]);

      if (
        typeof msg === "string" &&
        (msg.includes("Please enter your name") ||
          msg.includes("Name cannot be empty"))
      ) {
        setNeedsName(true);
      } else if (
        typeof msg === "string" &&
        msg.includes("You can start chatting now")
      ) {
        setNeedsName(false);
      }
    };

    websocket.onclose = () => {
      setMessages((prev) => [...prev]);
      setConnected(false);
    };

    websocket.onerror = () => {
      setMessages((prev) => [...prev]);
    };

    // Avoid setState synchronously in effect: move setWs to microtask
    Promise.resolve().then(() => setWs(websocket));

    return () => {
      websocket.close();
    };
  }, []);

  const handleSubmit = () => {
    if (!input.trim()) return;

    if (input === "/quit" || input === "/exit") {
      ws?.close();
      return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(input);
      setInput("");
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getMessageType = (msg: string) => {
    if (
      msg.includes("joined") ||
      msg.includes("Welcome") ||
      msg.includes("left") ||
      msg.includes("Please enter")
    ) {
      return "system";
    }
    if (msg.startsWith("Me:")) {
      return "me";
    }
    return "other";
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Chat Room</CardTitle>
                <CardDescription>Real-time messaging</CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={connected ? "default" : "destructive"}
                className="gap-1.5"
              >
                {connected ? (
                  <>
                    <Circle className="w-2 h-2 fill-current" />
                    Connected
                  </>
                ) : (
                  <>
                    <Circle className="w-2 h-2 fill-current" />
                    Disconnected
                  </>
                )}
              </Badge>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => ws?.close()}
                title="Disconnect"
                disabled={!connected}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const type = getMessageType(msg.text);

                if (type === "system") {
                  return (
                    <div key={idx} className="flex justify-center">
                      <Badge variant="outline" className="gap-2">
                        <Circle className="w-2 h-2 fill-current" />
                        {msg.text}
                      </Badge>
                    </div>
                  );
                }

                if (type === "me") {
                  return (
                    <div key={idx} className="flex justify-end gap-3">
                      <div className="flex flex-col items-end max-w-md">
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5">
                          <p className="text-sm">
                            {msg.text.replace("Me: ", "")}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {msg.timestamp.toLocaleTimeString()}
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

                // Extract name and message
                const colonIndex = msg.text.indexOf(":");
                const name =
                  colonIndex > 0 ? msg.text.substring(0, colonIndex) : "User";
                const message =
                  colonIndex > 0
                    ? msg.text.substring(colonIndex + 1).trim()
                    : msg.text;

                return (
                  <div key={idx} className="flex justify-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-muted text-xs">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col max-w-md">
                      <span className="text-xs font-medium text-muted-foreground mb-1">
                        {name}
                      </span>
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5">
                        <p className="text-sm">{message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <Separator />

          <div className="p-4 space-y-2">
            <div className="flex gap-2">
              <Input
                type="text"
                value={input}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setInput(e.target.value)
                }
                onKeyDown={handleKeyPress}
                placeholder={
                  needsName
                    ? "👤 Enter your name..."
                    : "💬 Type your message..."
                }
                disabled={!connected}
                className="flex-1"
              />

              <Button
                onClick={handleSubmit}
                disabled={!connected || !input.trim()}
                size="icon"
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Press Enter to send • Type /quit to exit
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatApp;
