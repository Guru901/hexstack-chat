import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Send, LogOut, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageType, type Message } from "./lib/types";
import MyMessage from "./components/myMessage";
import OtherMessage from "./components/otherMessage";

// Use environment variable for WebSocket URL
const WS_ADDRESS = import.meta.env.VITE_WS_ADDRESS || "wss://167.71.158.242/ws";

const LOCALSTORAGE_NAME_KEY = "chat_user_name";

const NameDialog = ({
  open,
  onSubmit,
}: {
  open: boolean;
  onSubmit: (name: string) => void;
}) => {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofill from localStorage if available when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
      const savedName = localStorage.getItem(LOCALSTORAGE_NAME_KEY);
      if (savedName && savedName.trim()) {
        setTimeout(() => setName(savedName), 0);
      }
    }
  }, [open]);

  const handleDialogSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      const savedName = localStorage.getItem(LOCALSTORAGE_NAME_KEY);
      if (!savedName || savedName !== trimmed) {
        localStorage.setItem(LOCALSTORAGE_NAME_KEY, trimmed);
      }
      onSubmit(trimmed);
      setName("");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleDialogSubmit(e);
        }
      }}
    >
      <form
        className="relative w-full max-w-xs bg-background rounded-lg shadow-xl p-6 flex flex-col gap-4 items-center"
        onSubmit={handleDialogSubmit}
      >
        <div className="w-full flex flex-col gap-2 items-center">
          <span className="text-lg font-semibold">Enter your name</span>
          <Input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setName(e.target.value)
            }
            placeholder="Your name..."
            maxLength={32}
            className="w-full"
            autoFocus
          />
        </div>
        <Button type="submit" className="w-full" disabled={!name.trim()}>
          Join Chat
        </Button>
      </form>
    </div>
  );
};

// Avoid duplicate WebSocket effects and double messages (React StrictMode mounts components twice in dev)
const wsRef = { current: null as WebSocket | null };

const ChatApp = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const [needsName, setNeedsName] = useState<boolean>(true);
  const [nameDialogOpen, setNameDialogOpen] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Check localStorage for name to pre-fill or attempt to auto-submit
  useEffect(() => {
    if (nameDialogOpen) {
      const savedName = localStorage.getItem(LOCALSTORAGE_NAME_KEY);
      if (savedName && savedName.trim()) {
        // Try to submit automatically if possible when dialog opens
        handleNameSubmit(savedName.trim());
      }
    }
  }, [nameDialogOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Only open name dialog if needs name is true
  useEffect(() => {
    setNameDialogOpen(needsName);
  }, [needsName]);

  useEffect(() => {
    if (wsRef.current) return;

    const websocket = new WebSocket(WS_ADDRESS);
    wsRef.current = websocket;

    websocket.onopen = () => {
      setConnected(true);

      // On connect, if there is a saved name and dialog isn't open, try sending it
      const savedName = localStorage.getItem(LOCALSTORAGE_NAME_KEY);
      if (savedName && savedName.trim() && needsName) {
        websocket.send(savedName.trim());
      }
    };

    websocket.onmessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data) as Message;

      setMessages((prev) => {
        const newMsg = {
          message_type: message.message_type,
          data: message.data,
          date: new Date(),
        };
        return [...prev, newMsg];
      });

      if (
        typeof event.data === "string" &&
        message.message_type === MessageType.System &&
        message.data === "Name cannot be empty"
      ) {
        setNeedsName(true);
        setNameDialogOpen(true);
      } else if (
        typeof event.data === "string" &&
        message.message_type === MessageType.Welcome &&
        message.data.includes("You can start chatting now")
      ) {
        setNeedsName(false);
        setNameDialogOpen(false);
      }
    };

    websocket.onclose = () => {
      setConnected(false);
    };

    websocket.onerror = () => {
      // Intentionally don't update messages to avoid artifact (unless you want to log error as system msg)
    };

    return () => {
      websocket.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameSubmit = (nameFromDialog: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(nameFromDialog);
    }
    // Save name to localStorage if not already there (in case dialog is auto-submitted)
    const savedName = localStorage.getItem(LOCALSTORAGE_NAME_KEY);
    if (!savedName || savedName !== nameFromDialog) {
      localStorage.setItem(LOCALSTORAGE_NAME_KEY, nameFromDialog);
    }
    setNameDialogOpen(false);
  };

  const handleSubmit = () => {
    if (!input.trim()) return;

    if (input === "/quit" || input === "/exit") {
      wsRef.current?.close();
      return;
    }

    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      !needsName
    ) {
      wsRef.current.send(input);
      setInput("");
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <NameDialog open={nameDialogOpen} onSubmit={handleNameSubmit} />
      <Card className="w-full max-w-4xl h-[90vh] flex flex-col">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
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
                onClick={() => wsRef.current?.close()}
                title="Disconnect"
                disabled={!connected}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="flex flex-col p-0 flex-1">
          <ScrollArea className="h-[68vh] p-6 min-h-0">
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const type = msg.message_type;
                if (
                  type === MessageType.Welcome ||
                  type === MessageType.System
                ) {
                  return (
                    <div key={idx} className="flex justify-center">
                      <Badge variant="outline" className="gap-2">
                        <Circle className="w-2 h-2 fill-current" />
                        {msg.data}
                      </Badge>
                    </div>
                  );
                }

                if (type === MessageType.Chat) {
                  const myName = localStorage.getItem(LOCALSTORAGE_NAME_KEY);
                  const isSentByMe =
                    msg.data.split(":")[0] === myName ||
                    msg.data.startsWith("Me:");

                  // Remove debug log for production:
                  // console.log(isSentByMe);

                  if (isSentByMe) {
                    return <MyMessage msg={msg} key={idx} />;
                  } else {
                    return <OtherMessage msg={msg} key={idx} />;
                  }
                }

                if (type === MessageType.PastMessages) {
                  const myName = localStorage.getItem(LOCALSTORAGE_NAME_KEY);
                  const isSentByMe =
                    msg.data.split(":")[0] === myName ||
                    msg.data.startsWith("Me:");

                  // Remove debug log for production:
                  // console.log(isSentByMe);

                  if (isSentByMe) {
                    return <MyMessage msg={msg} key={idx} />;
                  } else {
                    return <OtherMessage msg={msg} key={idx} />;
                  }
                }
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
                    ? "Enter your name to start"
                    : "💬 Type your message..."
                }
                disabled={!connected || needsName}
                className="flex-1"
              />

              <Button
                onClick={handleSubmit}
                disabled={!connected || !input.trim() || needsName}
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
