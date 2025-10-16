# Game Flow & Level System

## Overview

The game now has a complete multi-screen flow with loading, main menu, and progressive level selection similar to Candy Crush.

## Screen Flow

### 1. Loading Screen

- Displays the game logo with gradient styling
- Shows animated spinner
- Loading text updates as resources are loaded
- Automatically transitions to main menu when complete

### 2. Main Menu

- Clean, modern design with gradient logo
- **Play Button**: Opens the level select screen
- **Continue Button**: (Reserved for future save game functionality)

### 3. Level Select Screen

- Candy Crush-style progressive map
- Vertical scrolling path connecting levels
- Zigzag pattern (alternating left/right)
- Visual path connecting all levels

#### Level States:

- **Unlocked** (Blue): Can be played, glows on hover
- **Completed** (Green): Shows star rating (1-3 stars)
- **Locked** (Gray): Cannot be played yet

#### Star System:

Stars are earned based on remaining health:

- ⭐⭐⭐ = 80%+ health remaining
- ⭐⭐ = 50-79% health remaining
- ⭐ = Completed with <50% health

### 4. Gameplay

- Standard gameplay with level-specific objectives
- HUD shows level progress
- Pause button and stats panel

## Level Types

### 1. Wave-Based Levels (🎯, ⚔️, 🔥, ⚡, 🎆)

- **Objective**: Survive X waves
- **Progress**: Wave counter shows "Wave 5/10"
- **Completion**: Reach target wave count
- Examples: Level 1 (10 waves), Level 2 (15 waves), Level 4 (20 waves)

### 2. Timed Levels (⏱️, 🌪️)

- **Objective**: Survive for X minutes
- **Progress**: Countdown timer "Time 2:45"
- **Completion**: Timer reaches 0
- Examples: Level 3 (3 min), Level 7 (5 min)

### 3. Boss Levels (👑, 👹)

- **Objective**: Defeat boss in limited waves
- **Progress**: Wave counter
- **Completion**: Complete boss waves
- Examples: Level 5 (Mini-boss), Level 10 (Final boss)

### 4. Survival Levels (💀)

- **Objective**: Endless waves
- **Progress**: Track your best
- **Completion**: Never ends, just see how long you survive
- Example: Level 8

## Level Progression

1. **Level 1** is unlocked by default
2. Complete a level to unlock the next one
3. Can replay completed levels to improve star rating
4. Progress is saved to localStorage

## Current Level Configuration

| Level | Name     | Type     | Icon | Objective             | Difficulty |
| ----- | -------- | -------- | ---- | --------------------- | ---------- |
| 1     | Level 1  | Waves    | 🎯   | 10 waves              | ⭐         |
| 2     | Level 2  | Waves    | ⚔️   | 15 waves              | ⭐⭐       |
| 3     | Level 3  | Timed    | ⏱️   | 3 minutes             | ⭐⭐       |
| 4     | Level 4  | Waves    | 🔥   | 20 waves              | ⭐⭐⭐     |
| 5     | Level 5  | Boss     | 👑   | Boss battle (5 waves) | ⭐⭐⭐⭐   |
| 6     | Level 6  | Waves    | ⚡   | 25 waves              | ⭐⭐⭐     |
| 7     | Level 7  | Timed    | 🌪️   | 5 minutes             | ⭐⭐⭐⭐   |
| 8     | Level 8  | Survival | 💀   | Endless               | ⭐⭐⭐⭐⭐ |
| 9     | Level 9  | Waves    | 🎆   | 30 waves              | ⭐⭐⭐⭐   |
| 10    | Level 10 | Boss     | 👹   | Final boss            | ⭐⭐⭐⭐⭐ |

## Technical Details

### Files

- `src/levels.js`: Level configuration and progress management
- `src/main.js`: Game flow, UI management, level integration
- `index.html`: UI screens (loading, menu, level select)

### LocalStorage

Progress is automatically saved:

```javascript
Key: 'dartdart_levels'
Value: Array of level objects with completion status and stars
```

### Adding New Levels

Edit `src/levels.js` and add to the `LEVELS` array:

```javascript
{
  id: 11,
  name: 'Level 11',
  type: LEVEL_TYPES.WAVES,
  icon: '🎮',
  targetWaves: 35,
  description: 'Survive 35 waves',
  difficulty: 5,
  unlocked: false,
  completed: false,
  stars: 0
}
```

## Future Enhancements

- [ ] Continue button (save/load game state mid-level)
- [ ] Boss enemy types with unique mechanics
- [ ] Level-specific backgrounds/themes
- [ ] Achievement system
- [ ] Daily challenges
- [ ] Leaderboards per level
- [ ] Power-ups and consumables
- [ ] Monetization (gems, ads for extra redraws)
