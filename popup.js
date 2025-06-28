document.addEventListener("DOMContentLoaded", () => {
  const enableToggle = document.getElementById("enableToggle");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const openOptionsButton = document.getElementById("openOptions");
  const streakCount = document.getElementById("streakCount");
  const streakMessage = document.getElementById("streakMessage");
  const completedWorkouts = document.getElementById("completedWorkouts");
  const totalReminders = document.getElementById("totalReminders");

  // Motivational messages based on streak
  const streakMessages = {
    0: "Ready to start your journey? 💪",
    1: "Great start! Keep it going! 🌟",
    2: "Two days strong! You're building momentum! 🚀",
    3: "Three days in a row! You're on fire! 🔥",
    7: "One week streak! You're amazing! 🎉",
    14: "Two weeks! You're unstoppable! ⚡",
    30: "One month! You're a fitness champion! 🏆",
    default: "Keep up the incredible work! 💯"
  };

  // Load saved settings and stats
  loadSettings();
  loadStats();

  // Event listeners
  enableToggle.addEventListener("click", toggleReminders);
  darkModeToggle.addEventListener("click", toggleDarkMode);
  openOptionsButton.addEventListener("click", openOptions);

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(["enabled", "darkMode"]);
      
      // Set toggle state
      const enabled = result.enabled !== false; // Default to enabled
      enableToggle.classList.toggle("active", enabled);
      
      // Set dark mode
      if (result.darkMode) {
        document.body.classList.add("dark-mode");
        darkModeToggle.querySelector(".theme-icon").textContent = "☀️";
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  async function loadStats() {
    try {
      const result = await chrome.storage.local.get([
        "streak", 
        "completedWorkouts", 
        "totalReminders"
      ]);
      
      const streak = result.streak || 0;
      const completed = result.completedWorkouts || 0;
      const reminders = result.totalReminders || 0;
      
      // Update streak display
      streakCount.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
      
      // Update streak message
      const message = streakMessages[streak] || streakMessages.default;
      streakMessage.textContent = message;
      
      // Update stats
      completedWorkouts.textContent = completed;
      totalReminders.textContent = reminders;
      
      // Add animation to streak if it's greater than 0
      if (streak > 0) {
        streakCount.parentElement.classList.add("fade-in");
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  async function toggleReminders() {
    try {
      const isActive = enableToggle.classList.contains("active");
      const newState = !isActive;
      
      // Update UI immediately for responsiveness
      enableToggle.classList.toggle("active", newState);
      
      // Save state
      await chrome.storage.local.set({ enabled: newState });
      
      // Send message to background script
      chrome.runtime.sendMessage({ 
        action: "toggleReminders", 
        enabled: newState 
      });
      
      // Visual feedback
      enableToggle.style.transform = "scale(0.95)";
      setTimeout(() => {
        enableToggle.style.transform = "scale(1)";
      }, 150);
      
    } catch (error) {
      console.error("Error toggling reminders:", error);
      // Revert UI state on error
      enableToggle.classList.toggle("active");
    }
  }

  async function toggleDarkMode() {
    try {
      const isDark = document.body.classList.contains("dark-mode");
      const newDarkMode = !isDark;
      
      // Update UI
      document.body.classList.toggle("dark-mode", newDarkMode);
      darkModeToggle.querySelector(".theme-icon").textContent = newDarkMode ? "☀️" : "🌙";
      
      // Save preference
      await chrome.storage.local.set({ darkMode: newDarkMode });
      
      // Visual feedback
      darkModeToggle.style.transform = "rotate(180deg)";
      setTimeout(() => {
        darkModeToggle.style.transform = "rotate(0deg)";
      }, 300);
      
    } catch (error) {
      console.error("Error toggling dark mode:", error);
    }
  }

  function openOptions() {
    try {
      chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error("Error opening options:", error);
    }
  }

  // Add smooth transitions to toggle switches
  function addToggleAnimation(toggle) {
    toggle.addEventListener("mouseenter", () => {
      toggle.style.transform = "scale(1.05)";
    });
    
    toggle.addEventListener("mouseleave", () => {
      toggle.style.transform = "scale(1)";
    });
  }

  addToggleAnimation(enableToggle);
  addToggleAnimation(darkModeToggle);

  // Add ripple effect to buttons
  function addRippleEffect(button) {
    button.addEventListener("click", (e) => {
      const ripple = document.createElement("span");
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
      `;
      
      button.style.position = "relative";
      button.style.overflow = "hidden";
      button.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  }

  // Add CSS for ripple animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(2);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  addRippleEffect(openOptionsButton);

  // Auto-refresh stats every 30 seconds
  setInterval(loadStats, 30000);

  // Listen for storage changes to update UI in real-time
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync") {
      if (changes.streak || changes.completedWorkouts || changes.totalReminders) {
        loadStats();
      }
      if (changes.enabled) {
        enableToggle.classList.toggle("active", changes.enabled.newValue);
      }
      if (changes.darkMode) {
        document.body.classList.toggle("dark-mode", changes.darkMode.newValue);
        darkModeToggle.querySelector(".theme-icon").textContent = 
          changes.darkMode.newValue ? "☀️" : "🌙";
      }
    }
  });
});