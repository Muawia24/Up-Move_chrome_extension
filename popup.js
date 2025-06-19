document.addEventListener("DOMContentLoaded", () => {
  const enableToggle = document.getElementById("enableToggle");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const openOptionsButton = document.getElementById("openOptions");

  // Load saved settings
  chrome.storage.sync.get(["enabled", "darkMode"], (result) => {
    // Set toggle state
    const enabled = result.enabled !== false; // Default to enabled
    enableToggle.classList.toggle("active", enabled);
    
    // Set dark mode
    if (result.darkMode) {
      document.body.classList.add("dark-mode");
      darkModeToggle.textContent = "☀️";
    }
  });

  // Dark mode toggle
  darkModeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-mode");
    document.body.classList.toggle("dark-mode", !isDark);
    darkModeToggle.textContent = isDark ? "🌙" : "☀️";
    chrome.storage.sync.set({ darkMode: !isDark });
  });

  // Toggle functionality
  enableToggle.addEventListener("click", () => {
    const isActive = enableToggle.classList.contains("active");
    enableToggle.classList.toggle("active", !isActive);
    
    // Save enabled state
    chrome.storage.sync.set({ enabled: !isActive });
    
    // Update alarms in background script
    chrome.runtime.sendMessage({ action: "toggleReminders", enabled: !isActive });
  });

  // Open options page
  openOptionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});