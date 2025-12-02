export default function ChatBubble({
  message,
  isSentByMe,
}: {
  message: string;
  isSentByMe: boolean;
}) {
  return (
    <div
      className={`${
        isSentByMe ? "bg-primary text-primary-foreground" : "bg-muted"
      } max-w-[20vw]  rounded-2xl rounded-br-sm px-4 py-2.5`}
    >
      <p className="text-sm wrap-break-word">{message}</p>
    </div>
  );
}
