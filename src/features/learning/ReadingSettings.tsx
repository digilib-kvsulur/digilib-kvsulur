import ReadingPreferences from "./ReadingPreferences";
import { useReadingPrefs } from "./useReadingPrefs";

export default function ReadingSettings({ userId }: { userId?: string }) {
  const { prefs, update, dataSaver, setDataSaver, error } = useReadingPrefs(userId);
  return (
    <div className="space-y-3">
      <ReadingPreferences
        prefs={prefs}
        update={update}
        dataSaver={dataSaver}
        setDataSaver={setDataSaver}
        error={error || undefined}
      />
      <p className="px-1 text-xs text-muted-foreground">
        Preferences are saved to your account and apply to notes, flashcards, and offline reading on this device.
      </p>
    </div>
  );
}
