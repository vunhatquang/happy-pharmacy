"use client";

/**
 * Embeds a Jitsi Meet room in an iframe.
 *
 * Jitsi's public instance (meet.jit.si) needs no API key, account, or server of
 * our own — the room is created on first join and torn down when everyone
 * leaves. Set NEXT_PUBLIC_JITSI_DOMAIN to point at a self-hosted instance.
 */
export default function VideoCall({
  roomName,
  displayName,
  onLeave,
}: {
  roomName: string;
  displayName?: string;
  onLeave?: () => void;
}) {
  const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";

  // Jitsi reads the participant name and UI prefs from the URL fragment.
  const params = new URLSearchParams();
  if (displayName) params.set("userInfo.displayName", `"${displayName}"`);
  params.set("config.prejoinPageEnabled", "false");
  const src = `https://${domain}/${roomName}#${params.toString()}`;

  return (
    <div className="space-y-3">
      <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 aspect-video">
        <iframe
          src={src}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="absolute inset-0 w-full h-full border-0"
          title="Tư vấn video"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Phòng: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{roomName}</code>
        </span>
        <div className="flex items-center gap-3">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline"
          >
            Mở trong tab mới
          </a>
          {onLeave && (
            <button onClick={onLeave} className="text-red-600 hover:underline">
              Rời cuộc gọi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
