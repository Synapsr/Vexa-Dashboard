import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MeetingTitlesState {
  titles: Record<string, string>;
  setTitle: (meetingId: string, title: string) => void;
  getTitle: (meetingId: string) => string | undefined;
  removeTitle: (meetingId: string) => void;
}

export const useMeetingTitlesStore = create<MeetingTitlesState>()(
  persist(
    (set, get) => ({
      titles: {},

      setTitle: (meetingId: string, title: string) => {
        set((state) => ({
          titles: {
            ...state.titles,
            [meetingId]: title.trim(),
          },
        }));
      },

      getTitle: (meetingId: string) => {
        return get().titles[meetingId];
      },

      removeTitle: (meetingId: string) => {
        set((state) => {
          const { [meetingId]: _, ...rest } = state.titles;
          return { titles: rest };
        });
      },
    }),
    {
      name: "vexa-meeting-titles",
    }
  )
);
