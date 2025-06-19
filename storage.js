class WorkoutStorage {
  static async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, resolve);
    });
  }

  static async set(data) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(data, resolve);
    });
  }

  static async getSettings() {
    const defaults = {
      enabled: true,
      interval: 60,
      customWorkouts: [],
      streak: 0,
      completedWorkouts: 0,
      lastWorkoutDate: '',
      totalReminders: 0,
      workoutHistory: []
    };
    
    const stored = await this.get(Object.keys(defaults));
    return { ...defaults, ...stored };
  }

  static async updateStats(completed = false) {
    const settings = await this.getSettings();
    const today = new Date().toDateString();
    
    if (completed) {
      let streak = settings.streak;
      
      // Update streak logic
      if (settings.lastWorkoutDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (settings.lastWorkoutDate === yesterday.toDateString()) {
          streak += 1;
        } else if (settings.lastWorkoutDate === '') {
          streak = 1; // First workout
        } else {
          streak = 1; // Reset streak if gap
        }
      }
      
      // Add to workout history
      const workoutHistory = settings.workoutHistory || [];
      workoutHistory.push({
        date: today,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 30 days of history
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filteredHistory = workoutHistory.filter(entry => 
        new Date(entry.timestamp) > thirtyDaysAgo
      );
      
      await this.set({
        completedWorkouts: settings.completedWorkouts + 1,
        streak: streak,
        lastWorkoutDate: today,
        workoutHistory: filteredHistory
      });
    }
    
    // Always increment total reminders
    await this.set({
      totalReminders: settings.totalReminders + 1
    });
  }

  static async addCustomWorkout(workout) {
    const settings = await this.getSettings();
    const customWorkouts = settings.customWorkouts || [];
    
    if (!customWorkouts.includes(workout)) {
      customWorkouts.push(workout);
      await this.set({ customWorkouts });
      return true;
    }
    return false;
  }

  static async removeCustomWorkout(index) {
    const settings = await this.getSettings();
    const customWorkouts = settings.customWorkouts || [];
    
    if (index >= 0 && index < customWorkouts.length) {
      customWorkouts.splice(index, 1);
      await this.set({ customWorkouts });
      return true;
    }
    return false;
  }

  static async getWorkoutHistory(days = 7) {
    const settings = await this.getSettings();
    const workoutHistory = settings.workoutHistory || [];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return workoutHistory.filter(entry => 
      new Date(entry.timestamp) > cutoffDate
    );
  }

  static async exportData() {
    const settings = await this.getSettings();
    return {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: settings
    };
  }

  static async importData(data) {
    if (data.version === '1.0' && data.data) {
      await this.set(data.data);
      return true;
    }
    return false;
  }
}

// Make available globally for background script
if (typeof window !== 'undefined') {
  window.WorkoutStorage = WorkoutStorage;
}