import { useMemo } from "react";
import useWebSocket from "react-use-websocket";

interface Props {
  user: string;
}

export function useBackendSubscription({ user }: Props) {
  const connectionString = useMemo(() => {
    const host = window.location.host;
    return `ws://${host}/api/ws?user=${user}`; //TODO: should be url sanitized
  }, [user]);
  const { lastJsonMessage } = useWebSocket(connectionString);
}
