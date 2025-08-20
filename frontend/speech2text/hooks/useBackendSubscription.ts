"use client";
import {
  backendResponse,
  languageDetectionResponse,
  toNumpyResponse,
  transcriptionResponse,
  voiceSegmentsDetectionResponse,
} from "@/types/backend";
import { useEffect, useMemo } from "react";
import useWebSocket from "react-use-websocket";

interface Props {
  user: string;
  on?: {
    transcription?: (r: transcriptionResponse) => void | Promise<void>;
    languageFound?: (r: languageDetectionResponse) => void | Promise<void>;
    segmentation?: (r: voiceSegmentsDetectionResponse) => void | Promise<void>;
    preProcess?: (r: toNumpyResponse) => void | Promise<void>;
  };
}

export function useBackendSubscription({ user, on }: Props) {
  //const window = useWindow();
  const connectionString = useMemo(() => {
    const host = "localhost:8000";
    return `ws://${host}/ws?user=${user}`; //TODO: should be url sanitized
  }, [user /*window*/]);
  const { lastMessage } = useWebSocket(connectionString);
  const lastJsonMessage = useMemo(() => {
    if (lastMessage?.data) {
      return JSON.parse(lastMessage?.data) as backendResponse;
    }
    return null;
  }, [lastMessage]);
  useEffect(() => {
    console.log("Last JSON message:", lastJsonMessage);
    switch (lastJsonMessage?.task_type) {
      case "convert_to_numpy":
        if (on?.preProcess) on.preProcess(lastJsonMessage as toNumpyResponse);
        break;
      case "detect_language":
        if (on?.languageFound)
          on.languageFound(lastJsonMessage as languageDetectionResponse);
        break;
      case "detect_voice_segments":
        if (on?.segmentation)
          on.segmentation(lastJsonMessage as voiceSegmentsDetectionResponse);
        break;
      case "transcribe_segment":
        if (on?.transcription)
          on.transcription(lastJsonMessage as transcriptionResponse);
        break;
      default:
        break;
    }
  }, [lastJsonMessage, on]);
}
