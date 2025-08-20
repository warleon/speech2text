"use client";
import {
  backendResponse,
  languageDetectionResponse,
  toNumpyResponse,
  transcriptionResponse,
  voiceSegmentsDetectionResponse,
} from "@/types/backend";
import { useEffect, useMemo, useState } from "react";
import useWebSocket from "react-use-websocket";
import { usePrevious } from "./usePrevious";

interface Props {
  user: string;
  onTranscription?: (r: transcriptionResponse) => void | Promise<void>;
  onLanguageFound?: (r: languageDetectionResponse) => void | Promise<void>;
  onSegmentation?: (r: voiceSegmentsDetectionResponse) => void | Promise<void>;
  onPreProcess?: (r: toNumpyResponse) => void | Promise<void>;
}

export function useBackendSubscription({
  user,
  onLanguageFound,
  onPreProcess,
  onSegmentation,
  onTranscription,
}: Props) {
  //const window = useWindow();
  const connectionString = useMemo(() => {
    const host = "localhost:8000";
    return `ws://${host}/ws?user=${user}`; //TODO: should be url sanitized
  }, [user /*window*/]);
  const { lastMessage } = useWebSocket(connectionString);
  const prevMessage = usePrevious(lastMessage?.data);
  const isTheSame = useMemo(
    () => lastMessage?.data === prevMessage,
    [lastMessage, prevMessage]
  );
  const [lastJsonMessage, setLastJsonMessage] =
    useState<backendResponse | null>(null);
  useEffect(() => {
    if (lastMessage?.data) {
      if (!isTheSame) setLastJsonMessage(JSON.parse(lastMessage?.data));
    } else {
      setLastJsonMessage(null);
    }
  }, [lastMessage, isTheSame]);
  useEffect(() => {
    if (isTheSame) return;
    console.log("Last JSON message:", lastJsonMessage);
    switch (lastJsonMessage?.task_type) {
      case "convert_to_numpy":
        if (onPreProcess) onPreProcess(lastJsonMessage as toNumpyResponse);
        break;
      case "detect_language":
        if (onLanguageFound)
          onLanguageFound(lastJsonMessage as languageDetectionResponse);
        break;
      case "detect_voice_segments":
        if (onSegmentation)
          onSegmentation(lastJsonMessage as voiceSegmentsDetectionResponse);
        break;
      case "transcribe_segment":
        if (onTranscription)
          onTranscription(lastJsonMessage as transcriptionResponse);
        break;
      default:
        break;
    }
  }, [
    isTheSame,
    lastJsonMessage,
    onLanguageFound,
    onPreProcess,
    onSegmentation,
    onTranscription,
  ]);
}
