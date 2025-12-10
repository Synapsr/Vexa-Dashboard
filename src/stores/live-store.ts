import { create } from "zustand";
import type { Meeting, TranscriptSegment, Platform, MeetingStatus } from "@/types/vexa";

interface LiveMeetingState {
  // Current live meeting
  activeMeeting: Meeting | null;
  liveTranscripts: TranscriptSegment[];

  // Connection state
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: string | null;

  // Bot state
  botStatus: MeetingStatus | null;

  // Actions
  setActiveMeeting: (meeting: Meeting | null) => void;
  addLiveTranscript: (segment: TranscriptSegment) => void;
  updateLiveTranscript: (segment: TranscriptSegment) => void;
  setBotStatus: (status: MeetingStatus) => void;
  setConnectionState: (isConnecting: boolean, isConnected: boolean, error?: string) => void;
  clearLiveSession: () => void;
}

export const useLiveStore = create<LiveMeetingState>((set, get) => ({
  activeMeeting: null,
  liveTranscripts: [],
  isConnecting: false,
  isConnected: false,
  connectionError: null,
  botStatus: null,

  setActiveMeeting: (meeting: Meeting | null) => {
    set({
      activeMeeting: meeting,
      botStatus: meeting?.status || null,
      liveTranscripts: [],
    });
  },

  addLiveTranscript: (segment: TranscriptSegment) => {
    const { liveTranscripts } = get();

    // Check if segment already exists (by absolute_start_time)
    const existingIndex = liveTranscripts.findIndex(
      (t) => t.absolute_start_time === segment.absolute_start_time
    );

    if (existingIndex !== -1) {
      // Update existing segment if newer
      const existing = liveTranscripts[existingIndex];
      if (segment.updated_at && existing.updated_at) {
        if (new Date(segment.updated_at) > new Date(existing.updated_at)) {
          const updated = [...liveTranscripts];
          updated[existingIndex] = segment;
          set({ liveTranscripts: updated });
        }
      } else {
        const updated = [...liveTranscripts];
        updated[existingIndex] = segment;
        set({ liveTranscripts: updated });
      }
    } else {
      // Add new segment and sort by start_time
      const updated = [...liveTranscripts, segment].sort(
        (a, b) => a.start_time - b.start_time
      );
      set({ liveTranscripts: updated });
    }
  },

  updateLiveTranscript: (segment: TranscriptSegment) => {
    const { liveTranscripts } = get();
    const updated = liveTranscripts.map((t) =>
      t.absolute_start_time === segment.absolute_start_time ? segment : t
    );
    set({ liveTranscripts: updated });
  },

  setBotStatus: (status: MeetingStatus) => {
    const { activeMeeting } = get();
    set({
      botStatus: status,
      activeMeeting: activeMeeting ? { ...activeMeeting, status } : null,
    });
  },

  setConnectionState: (isConnecting: boolean, isConnected: boolean, error?: string) => {
    set({
      isConnecting,
      isConnected,
      connectionError: error || null,
    });
  },

  clearLiveSession: () => {
    set({
      activeMeeting: null,
      liveTranscripts: [],
      isConnecting: false,
      isConnected: false,
      connectionError: null,
      botStatus: null,
    });
  },
}));
