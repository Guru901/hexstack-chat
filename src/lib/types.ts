export type Message = {
  message_type: MessageType;
  data: string;
  date: Date;
};

export enum MessageType {
  System = "System",
  Welcome = "Welcome",
  PastMessages = "PastMessages",
  Chat = "Chat",
}
