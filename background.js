import { getSettings, updateSettings, getStats, updateStats, getWorkouts } from './utils/storage.js';

// Default workout suggestions
const defaultWorkouts = [
  "Do 10 squats",
  "Stretch your back",
  "Walk around for 5 minutes",
  "Do 15 jumping jacks",
  "Touch your toes 10 times"
];

// Function to show notification
async function showWorkoutNotification() {
  const settings = await getSettings();
  if (!settings.enabled) return; // Don't show notification if reminders are disabled

  const allWorkouts = [...defaultWorkouts, ...(await getWorkouts())];
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
    const audio = new Audio("notification.mp3"); // Assuming you have a notification sound file
    audio.play();
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId === "workoutReminder") {
    if (buttonIndex === 0) { // Done button
      const stats = await getStats();
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
      updateStats(stats);

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

// Set up initial alarm when extension is installed or updated
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  if (settings.enabled !== false) { // If not explicitly disabled
    const interval = settings.interval || 60; // Default to 60 minutes
    chrome.alarms.create("workoutReminder", {
      delayInMinutes: interval,
      periodInMinutes: interval,
    });
  }
});

// Listen for messages from popup.js to toggle reminders
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "toggleReminders") {
    const settings = await getSettings();
    settings.enabled = request.enabled;
    await updateSettings(settings);

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
});