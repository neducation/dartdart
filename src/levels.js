// Level Configuration System
// Each level has different objectives and challenges

export const LEVEL_TYPES = {
  WAVES: "waves",
  TIMED: "timed",
  SURVIVAL: "survival",
  BOSS: "boss",
};

export const LEVELS = [
  {
    id: 1,
    name: "Level 1",
    type: LEVEL_TYPES.WAVES,
    icon: "🎯",
    targetWaves: 10,
    description: "Survive 10 waves",
    difficulty: 1,
    unlocked: true,
    completed: false,
    stars: 0,
  },
  {
    id: 2,
    name: "Level 2",
    type: LEVEL_TYPES.WAVES,
    icon: "⚔️",
    targetWaves: 15,
    description: "Survive 15 waves",
    difficulty: 2,
    unlocked: false,
    completed: false,
    stars: 0,
  },
  {
    id: 3,
    name: "Level 3",
    type: LEVEL_TYPES.TIMED,
    icon: "⏱️",
    targetTime: 180, // 3 minutes in seconds
    description: "Survive 3 minutes",
    difficulty: 2,
    unlocked: false,
    completed: false,
    stars: 0,
  },
  {
    id: 4,
    name: "Level 4",
    type: LEVEL_TYPES.WAVES,
    icon: "🔥",
    targetWaves: 20,
    description: "Survive 20 waves",
    difficulty: 3,
    unlocked: false,
    completed: false,
    stars: 0,
  },
  {
    id: 5,
    name: "Level 5",
    type: LEVEL_TYPES.BOSS,
    icon: "👑",
    targetWaves: 5,
    description: "Defeat the boss",
    difficulty: 4,
    unlocked: false,
    completed: false,
    stars: 0,
  },
  {
    id: 6,
    name: "Level 6",
    type: LEVEL_TYPES.WAVES,
    icon: "⚡",
    targetWaves: 25,
    description: "Survive 25 waves",
    difficulty: 3,
    unlocked: false,
    completed: false,
    stars: 0,
  },
  {
    id: 7,
    name: "Level 7",
    type: LEVEL_TYPES.TIMED,
    icon: "🌪️",
    targetTime: 300, // 5 minutes
    description: "Survive 5 minutes",
    difficulty: 4,
    unlocked: false,
    completed: false,
    stars: 0,
  },
  {
    id: 8,
    name: "Level 8",
    type: LEVEL_TYPES.SURVIVAL,
    icon: "💀",
    description: "Endless survival",
    difficulty: 5,
    unlocked: false,
    completed: false,
    stars: 0,
  },
  {
    id: 9,
    name: "Level 9",
    type: LEVEL_TYPES.WAVES,
    icon: "🎆",
    targetWaves: 30,
    description: "Survive 30 waves",
    difficulty: 4,
    unlocked: false,
    completed: false,
    stars: 0,
  },
  {
    id: 10,
    name: "Level 10",
    type: LEVEL_TYPES.BOSS,
    icon: "👹",
    targetWaves: 10,
    description: "Final boss battle",
    difficulty: 5,
    unlocked: false,
    completed: false,
    stars: 0,
  },
];

export class LevelManager {
  constructor() {
    this.currentLevel = null;
    this.levels = this.loadProgress();
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem("dartdart_levels");
      if (saved) {
        const savedLevels = JSON.parse(saved);
        // Merge with default levels (in case new levels were added)
        return LEVELS.map((level) => {
          const savedLevel = savedLevels.find((l) => l.id === level.id);
          return savedLevel ? { ...level, ...savedLevel } : level;
        });
      }
    } catch (e) {
      console.error("Failed to load level progress:", e);
    }
    return [...LEVELS];
  }

  saveProgress() {
    try {
      localStorage.setItem("dartdart_levels", JSON.stringify(this.levels));
    } catch (e) {
      console.error("Failed to save level progress:", e);
    }
  }

  getLevel(id) {
    return this.levels.find((l) => l.id === id);
  }

  completeLevel(id, stars = 1) {
    const level = this.getLevel(id);
    if (level) {
      level.completed = true;
      level.stars = Math.max(level.stars, stars);

      // Unlock next level
      const nextLevel = this.getLevel(id + 1);
      if (nextLevel) {
        nextLevel.unlocked = true;
      }

      this.saveProgress();
    }
  }

  resetProgress() {
    this.levels = [...LEVELS];
    this.saveProgress();
  }

  setCurrentLevel(id) {
    this.currentLevel = this.getLevel(id);
    return this.currentLevel;
  }

  getCurrentLevel() {
    return this.currentLevel;
  }

  getUnlockedLevels() {
    return this.levels.filter((l) => l.unlocked);
  }

  getCompletedLevels() {
    return this.levels.filter((l) => l.completed);
  }
}
