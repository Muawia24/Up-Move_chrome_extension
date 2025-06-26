import WorkoutStorage from './utils/storage.js';

// Default workout suggestions
const defaultWorkouts = [
  "Wall sit for 30 seconds",
  "Do 10 push-ups (wall, desk, or regular)",
  "Walk around for 5 minutes",
  "Do 15 jumping jacks",
  "Touch your toes 10 times",
  "Cat-Cow stretch",
  "March in place for 1 minute"
];

// Function to show notification
async function showWorkoutNotification() {
  const settings = await WorkoutStorage.getSettings();
  if (!settings.enabled) return; // Don't show notification if reminders are disabled

  const allWorkouts = [...defaultWorkouts, ...(await WorkoutStorage.getWorkouts())];
  const randomWorkout = allWorkouts[Math.floor(Math.random() * allWorkouts.length)];

  chrome.notifications.create(
    "workoutReminder",
    {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Time for a Workout Break!",
      message: randomWorkout,
      buttons: [{ title: "✅ Done" }, { title: "🔁 Remind me later" }],
      priority: 2,
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Notification creation error: ", chrome.runtime.lastError);
      }
    }
  );

  // Play sound if enabled
  if (settings.soundEnabled) {
    try {
      chrome.tts.speak(`Time to take a workout break!, ${randomWorkout}`, {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      lang: "en-US",
      enqueue: false
      });
    } catch (err) {
      console.error("TTS error:", err);
    }
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId === "workoutReminder") {
    if (buttonIndex === 0) { // Done button
      const stats = await WorkoutStorage.getSettings();
      const today = new Date().toDateString();

      // Update completed workouts
      stats.completedWorkouts = (stats.completedWorkouts || 0) + 1;

      // Update streak
      if (stats.lastWorkoutDate === today) {
        // Workout already completed today, do nothing to streak
      } else if (stats.lastWorkoutDate) {
        const lastDate = new Date(stats.lastWorkoutDate);
        const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) { // If yesterday was the last workout
          stats.streak = (stats.streak || 0) + 1;
        } else {
          stats.streak = 1; // Reset streak
        }
      } else {
        stats.streak = 1; // First workout
      }
      stats.lastWorkoutDate = today;
      WorkoutStorage.updateStats(true);

      chrome.notifications.clear("workoutReminder");
    } else if (buttonIndex === 1) { // Remind me later button
      chrome.notifications.clear("workoutReminder");
      chrome.alarms.create("workoutReminder", {
        delayInMinutes: 5,
      });
    }
  }
});

// Handle alarm for workout reminders
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "workoutReminder") {
    showWorkoutNotification();
  }
});

// Listen for messages from popup.js to toggle reminders
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "toggleReminders") {
    const settings = await WorkoutStorage.getSettings();
    settings.enabled = request.enabled;
    await WorkoutStorage.updateSettings(settings);

    if (request.enabled) {
      const interval = settings.interval || 60;
      chrome.alarms.clear("workoutReminder");
      chrome.alarms.create("workoutReminder", {
        delayInMinutes: interval,
        periodInMinutes: interval,
      });
    } else {
      chrome.alarms.clear("workoutReminder");
    }

    sendResponse({ status: "reminders toggled" });
  }

  if (request.action === "resetAlarmWithNewInterval") {
    const settings = await WorkoutStorage.getSettings();
    const interval = settings.interval || 60;

    chrome.alarms.clear("workoutReminder");
    chrome.alarms.create("workoutReminder", {
        delayInMinutes: interval,
        periodInMinutes: interval,
    });

    sendResponse({ status: "reminders toggled" });
  }
});