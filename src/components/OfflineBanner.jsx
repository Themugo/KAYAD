import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 px-4 text-sm font-medium">
      You're offline — some features may be unavailable. Check your connection.
    </div>
  );
}
