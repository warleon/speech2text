"use client";
import {
  alignmentResponse,
  backendResponse,
  diarizationResponse,
  languageDetectionResponse,
  toNumpyResponse,
  transcriptionResponse,
  voiceSegmentsDetectionResponse,
} from "@/types/backend";
import { useEffect, useMemo, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { usePrevious } from "./usePrevious";
import { json } from "stream/consumers";

interface Props {
  user: string;
  onTranscription?: (r: transcriptionResponse) => void | Promise<void>;
  onLanguageFound?: (r: languageDetectionResponse) => void | Promise<void>;
  onSegmentation?: (r: voiceSegmentsDetectionResponse) => void | Promise<void>;
  onPreProcess?: (r: toNumpyResponse) => void | Promise<void>;
  onAlignment?: (r: alignmentResponse) => void | Promise<void>;
  onDiarization?: (r: diarizationResponse) => void | Promise<void>;
}

export function useBackendSubscription({
  user,
  onLanguageFound,
  onPreProcess,
  onSegmentation,
  onTranscription,
  onAlignment,
  onDiarization,
}: Props) {
  //const window = useWindow();
  const connectionString = useMemo(() => {
    const host = "localhost:8000";
    return `ws://${host}/ws?user=${user}`; //TODO: should be url sanitized
  }, [user /*window*/]);
  const { lastMessage, readyState } = useWebSocket(connectionString, {
    shouldReconnect: () => true,
    reconnectInterval: 10_000,
    reconnectAttempts: Infinity,
  });
  const lastJsonMessage = useMemo(() => {
    if (lastMessage?.data)
      return JSON.parse(lastMessage.data) as backendResponse;
    return null;
  }, [lastMessage]);
  const prev = usePrevious(lastJsonMessage);
  useEffect(() => {
    if (prev === lastJsonMessage) return;
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
      case "diarize":
        if (onDiarization)
          onDiarization(lastJsonMessage as diarizationResponse);
        break;
      case "align_words":
        if (onAlignment) onAlignment(lastJsonMessage as alignmentResponse);
        break;
      case "collect_transcriptions":
        break; // no callback
      default:
        break;
    }
  }, [
    lastJsonMessage,
    onAlignment,
    onDiarization,
    onLanguageFound,
    onPreProcess,
    onSegmentation,
    onTranscription,
    prev,
  ]);

  useEffect(() => {
    if (readyState == ReadyState.OPEN)
      console.log("WebSocket Connection Stablished Successfully");
  }, [readyState]);
}
