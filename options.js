document.addEventListener("DOMContentLoaded", () => {
  const intervalInput = document.getElementById("interval");
  const soundToggle = document.getElementById("soundToggle");
  const customWorkoutInput = document.getElementById("customWorkout");
  const addWorkoutButton = document.getElementById("addWorkout");
  const workoutList = document.getElementById("workoutList");
  const saveOptionsButton = document.getElementById("saveOptions");

  // Load saved settings
  chrome.storage.sync.get([
    "interval", 
    "soundEnabled",
    "customWorkouts"
  ], (result) => {
    // Set interval
    if (result.interval) {
      intervalInput.value = result.interval;
    }
    
    // Set sound toggle
    soundToggle.classList.toggle("active", result.soundEnabled !== false);
    
    // Load custom workouts
    loadCustomWorkouts(result.customWorkouts || []);
  });

  // Sound toggle
  soundToggle.addEventListener("click", () => {
    const isActive = soundToggle.classList.contains("active");
    soundToggle.classList.toggle("active", !isActive);
    chrome.storage.sync.set({ soundEnabled: !isActive });
  });

  // Add custom workout
  addWorkoutButton.addEventListener("click", () => {
    const workoutText = customWorkoutInput.value.trim();
    if (workoutText) {
      chrome.storage.sync.get(["customWorkouts"], (result) => {
        const customWorkouts = result.customWorkouts || [];
        if (!customWorkouts.includes(workoutText)) {
          customWorkouts.push(workoutText);
          chrome.storage.sync.set({ customWorkouts: customWorkouts }, () => {
            loadCustomWorkouts(customWorkouts);
            customWorkoutInput.value = "";
          });
        }
      });
    }
  });

  // Enter key for adding workout
  customWorkoutInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addWorkoutButton.click();
    }
  });

  // Load custom workouts
  function loadCustomWorkouts(workouts) {
    workoutList.innerHTML = "";
    workouts.forEach((workout, index) => {
      const workoutItem = document.createElement("div");
      workoutItem.className = "workout-item";
      workoutItem.innerHTML = `
        <span>${workout}</span>
        <button class="remove-workout" data-index="${index}">×</button>
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

  // Remove custom workout
  function removeCustomWorkout(index) {
    chrome.storage.sync.get(["customWorkouts"], (result) => {
      const customWorkouts = result.customWorkouts || [];
      customWorkouts.splice(index, 1);
      chrome.storage.sync.set({ customWorkouts: customWorkouts }, () => {
        loadCustomWorkouts(customWorkouts);
      });
    });
  }

  // Save options
  saveOptionsButton.addEventListener("click", () => {
    const interval = parseInt(intervalInput.value);
    
    if (interval >= 5 && interval <= 480) {
      chrome.storage.sync.set({ 
        interval: interval
      }, () => {
        // Show success feedback
        const originalText = saveOptionsButton.textContent;
        saveOptionsButton.textContent = "✅ Saved!";
        saveOptionsButton.style.background = "#4CAF50";
        
        setTimeout(() => {
          saveOptionsButton.textContent = originalText;
          saveOptionsButton.style.background = "";
        }, 1500);
      });
    } else {
      alert("Please enter a valid interval (5-480 minutes).");
    }
  });
});