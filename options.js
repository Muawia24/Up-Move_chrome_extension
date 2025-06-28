document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const intervalInput = document.getElementById("interval");
  const soundToggle = document.getElementById("soundToggle");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const customWorkoutInput = document.getElementById("customWorkout");
  const addWorkoutButton = document.getElementById("addWorkout");
  const workoutList = document.getElementById("workoutList");
  const saveOptionsButton = document.getElementById("saveOptions");
  const successToast = document.getElementById("successToast");
  
  // Stats elements
  const currentStreak = document.getElementById("currentStreak");
  const totalCompleted = document.getElementById("totalCompleted");
  const totalRemindersStats = document.getElementById("totalRemindersStats");
  const bestStreak = document.getElementById("bestStreak");
  
  // Action buttons
  const exportDataButton = document.getElementById("exportData");
  const resetStatsButton = document.getElementById("resetStats");
  const viewHelpButton = document.getElementById("viewHelp");
  const reportIssueButton = document.getElementById("reportIssue");

  // Initialize
  loadSettings();
  loadStats();
  setupEventListeners();

  function setupEventListeners() {
    // Settings
    saveOptionsButton.addEventListener("click", saveOptions);
    soundToggle.addEventListener("click", toggleSound);
    darkModeToggle.addEventListener("click", toggleDarkMode);
    
    // Custom workouts
    addWorkoutButton.addEventListener("click", addCustomWorkout);
    customWorkoutInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        addCustomWorkout();
      }
    });
    
    // Input validation
    intervalInput.addEventListener("input", validateInterval);
    customWorkoutInput.addEventListener("input", validateWorkoutInput);
    
    // Action buttons
    resetStatsButton.addEventListener("click", resetStats);
    viewHelpButton.addEventListener("click", viewHelp);
    reportIssueButton.addEventListener("click", reportIssue);
    
    // Auto-save interval on change
    intervalInput.addEventListener("change", saveOptions);
  }

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        "interval", 
        "soundEnabled",
        "customWorkouts",
        "darkMode"
      ]);
      
      // Set interval
      intervalInput.value = result.interval || 60;
      
      // Set sound toggle
      soundToggle.classList.toggle("active", result.soundEnabled !== false);
      
      // Set dark mode
      if (result.darkMode) {
        document.body.classList.add("dark-mode");
        darkModeToggle.classList.add("active");
      }
      
      // Load custom workouts
      loadCustomWorkouts(result.customWorkouts || []);
      
    } catch (error) {
      console.error("Error loading settings:", error);
      showToast("Error loading settings", "error");
    }
  }

  async function loadStats() {
    try {
      const result = await chrome.storage.sync.get([
        "streak", 
        "completedWorkouts", 
        "totalReminders",
        "workoutHistory"
      ]);
      
      const streak = result.streak || 0;
      const completed = result.completedWorkouts || 0;
      const reminders = result.totalReminders || 0;
      
      // Update stats display with animation
      animateNumber(currentStreak, streak);
      animateNumber(totalCompleted, completed);
      animateNumber(totalRemindersStats, reminders);
      
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  function animateNumber(element, targetValue) {
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
      
      element.textContent = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      }
    }
    
    requestAnimationFrame(updateNumber);
  }

  async function saveOptions() {
    const interval = parseInt(intervalInput.value);
    
    if (!validateInterval()) {
      return;
    }
    
    try {
      // Show loading state
      saveOptionsButton.classList.add("loading");
      
      await chrome.storage.sync.set({ interval: interval });
      
      // Send message to background script to update alarm
    
    chrome.runtime.sendMessage({ action: "resetAlarmWithNewInterval" });
      
      // Show success feedback
      showToast("Settings saved successfully!");
      saveOptionsButton.classList.add("btn-success");
      
      setTimeout(() => {
        saveOptionsButton.classList.remove("btn-success", "loading");
      }, 2000);
      
    } catch (error) {
      console.error("Error saving options:", error);
      showToast("Error saving settings", "error");
      saveOptionsButton.classList.remove("loading");
    }
  }

  function validateInterval() {
    const interval = parseInt(intervalInput.value);
    const isValid = interval >= 5 && interval <= 480;
    
    intervalInput.classList.toggle("error", !isValid);
    intervalInput.classList.toggle("success", isValid);
    
    // Remove existing error message
    const existingError = intervalInput.parentNode.querySelector(".error-message");
    if (existingError) {
      existingError.remove();
    }
    
    if (!isValid) {
      const errorMessage = document.createElement("span");
      errorMessage.className = "error-message";
      errorMessage.textContent = "Please enter a value between 5 and 480 minutes";
      intervalInput.parentNode.appendChild(errorMessage);
    }
    
    return isValid;
  }

  function validateWorkoutInput() {
    const text = customWorkoutInput.value.trim();
    const isValid = text.length > 0 && text.length <= 100;
    
    customWorkoutInput.classList.toggle("error", !isValid && text.length > 0);
    addWorkoutButton.disabled = !isValid;
    
    return isValid;
  }

  async function toggleSound() {
    try {
      const isActive = soundToggle.classList.contains("active");
      const newState = !isActive;
      
      soundToggle.classList.toggle("active", newState);
      await chrome.storage.sync.set({ soundEnabled: newState });
      
      showToast(`Sound notifications ${newState ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      console.error("Error toggling sound:", error);
      soundToggle.classList.toggle("active");
    }
  }

  async function toggleDarkMode() {
    try {
      const isDark = document.body.classList.contains("dark-mode");
      const newDarkMode = !isDark;
      
      document.body.classList.toggle("dark-mode", newDarkMode);
      darkModeToggle.classList.toggle("active", newDarkMode);
      
      await chrome.storage.sync.set({ darkMode: newDarkMode });
      
      showToast(`${newDarkMode ? 'Dark' : 'Light'} mode enabled`);
      
    } catch (error) {
      console.error("Error toggling dark mode:", error);
    }
  }

  async function addCustomWorkout() {
    const workoutText = customWorkoutInput.value.trim();
    
    if (!validateWorkoutInput()) {
      return;
    }
    
    try {
      const result = await chrome.storage.sync.get(["customWorkouts"]);
      const customWorkouts = result.customWorkouts || [];
      
      if (customWorkouts.includes(workoutText)) {
        showToast("This workout already exists", "warning");
        return;
      }
      
      customWorkouts.push(workoutText);
      await chrome.storage.sync.set({ customWorkouts: customWorkouts });
      
      loadCustomWorkouts(customWorkouts);
      customWorkoutInput.value = "";
      customWorkoutInput.classList.remove("success", "error");
      
      showToast("Workout added successfully!");
      
    } catch (error) {
      console.error("Error adding workout:", error);
      showToast("Error adding workout", "error");
    }
  }

  function loadCustomWorkouts(workouts) {
    workoutList.innerHTML = "";
    
    if (workouts.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "workout-list-empty";
      emptyState.textContent = "No custom workouts yet. Add one above!";
      workoutList.appendChild(emptyState);
      return;
    }
    
    workouts.forEach((workout, index) => {
      const workoutItem = document.createElement("div");
      workoutItem.className = "workout-item fade-in";
      workoutItem.style.animationDelay = `${index * 0.1}s`;
      
      workoutItem.innerHTML = `
        <span class="workout-text">${escapeHtml(workout)}</span>
        <button class="remove-workout" data-index="${index}" aria-label="Remove workout">
          ×
        </button>
      `;
      
      workoutList.appendChild(workoutItem);
    });
    
    // Add remove functionality
    document.querySelectorAll(".remove-workout").forEach(button => {
      button.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        removeCustomWorkout(index);
      });
    });
  }

  async function removeCustomWorkout(index) {
    try {
      const result = await chrome.storage.sync.get(["customWorkouts"]);
      const customWorkouts = result.customWorkouts || [];
      
      if (index >= 0 && index < customWorkouts.length) {
        const removedWorkout = customWorkouts[index];
        customWorkouts.splice(index, 1);
        
        await chrome.storage.sync.set({ customWorkouts: customWorkouts });
        loadCustomWorkouts(customWorkouts);
        
        showToast(`"${removedWorkout}" removed`);
      }
      
    } catch (error) {
      console.error("Error removing workout:", error);
      showToast("Error removing workout", "error");
    }
  }

  async function resetStats() {
    if (!confirm("Are you sure you want to reset all statistics? This action cannot be undone.")) {
      return;
    }
    
    try {
      await chrome.storage.sync.set({
        streak: 0,
        completedWorkouts: 0,
        totalReminders: 0,
        bestStreak: 0,
        lastWorkoutDate: "",
        workoutHistory: []
      });
      
      loadStats();
      showToast("Statistics reset successfully!");
      
    } catch (error) {
      console.error("Error resetting stats:", error);
      showToast("Error resetting statistics", "error");
    }
  }

  function viewHelp() {
    const helpContent = `
      <h3>How to use Workout Reminder:</h3>
      <ul>
        <li><strong>Reminder Interval:</strong> Set how often you want to be reminded (5-480 minutes)</li>
        <li><strong>Custom Workouts:</strong> Add your own workout suggestions</li>
        <li><strong>Sound Notifications:</strong> Enable/disable notification sounds</li>
        <li><strong>Dark Mode:</strong> Switch between light and dark themes</li>
        <li><strong>Statistics:</strong> Track your progress and streaks</li>
      </ul>
      <p>Click the extension icon to quickly enable/disable reminders and view your current streak!</p>
    `;
    
    showModal("Help", helpContent);
  }

  function reportIssue() {
    const issueUrl = "https://github.com/Muawia24/workout-reminder-chrome_extension/issues";
    window.open(issueUrl, "_blank");
  }

  function showToast(message, type = "success") {
    const toast = successToast;
    const icon = toast.querySelector(".toast-icon");
    const messageEl = toast.querySelector(".toast-message");
    
    // Set icon based on type
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️"
    };
    
    icon.textContent = icons[type] || icons.success;
    messageEl.textContent = message;
    
    // Update toast styling based on type
    toast.style.background = type === "error" ? "#EF4444" : 
                            type === "warning" ? "#F59E0B" : 
                            type === "info" ? "#3B82F6" : "#10B981";
    
    toast.classList.add("show");
    
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  function showModal(title, content) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    // Create modal content
    const modal = document.createElement("div");
    modal.style.cssText = `
      background: var(--surface-color);
      border-radius: var(--radius-lg);
      padding: var(--spacing-xl);
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: var(--shadow-large);
    `;
    
    modal.innerHTML = `
      <h2 style="margin-bottom: var(--spacing-lg); color: var(--text-primary);">${title}</h2>
      <div style="color: var(--text-secondary); line-height: 1.6;">${content}</div>
      <button class="btn btn-primary" style="margin-top: var(--spacing-lg);">Close</button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Close modal
    const closeBtn = modal.querySelector("button");
    const closeModal = () => document.body.removeChild(overlay);
    
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync") {
      if (changes.streak || changes.completedWorkouts || changes.totalReminders || changes.bestStreak) {
        loadStats();
      }
    }
  });

  // Auto-refresh stats every 30 seconds
  setInterval(loadStats, 30000);
});