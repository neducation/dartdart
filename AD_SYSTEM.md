# Ad System Implementation

## ✅ Fixed Issues
1. **Player Level Up Error** - Fixed "Cannot set properties of null" error by deferring player setup until player is created
2. **Proper initialization flow** - setupLeveling now creates a deferred handler that's called when player is instantiated

## ✅ Ad System Features

### Ad Triggers
- **Every 5 waves completed** - Shows ad before wave upgrade screen
- **Every 2 page refreshes** - Shows ad on page load (tracked in localStorage)

### Ad Manager (`src/ads.js`)
- Manages 4 ad video slots (ad1.mp4 - ad4.mp4)
- Random ad selection
- Refresh counter tracking with localStorage persistence
- Wave completion tracking
- Graceful fallback if videos don't exist

### Ad Display
- **Full-screen overlay** with dark background (95% opacity)
- **Video player** with autoplay and controls disabled
- **Close button** (✕ Close Ad) - Always visible, red themed
- **Auto-close** when video ends
- **Responsive design** - Max 90vw width, 70vh height
- **Z-index: 2000** - Appears above all game elements

### Ad Folder Structure
```
assets/ads/
  ├── README.md           # Quick reference
  ├── INSTRUCTIONS.md     # Detailed setup guide
  ├── ad1.mp4            # Upload your ads here
  ├── ad2.mp4            # (Currently missing - graceful fallback)
  ├── ad3.mp4            # 
  └── ad4.mp4            # 
```

## How to Add Your Ads

1. **Prepare videos** in MP4 format (H.264 codec recommended)
2. **Name them exactly**: `ad1.mp4`, `ad2.mp4`, `ad3.mp4`, `ad4.mp4`
3. **Place in**: `assets/ads/` folder
4. **Refresh** the game - ads will show automatically

## Testing the Ad System

### Test Wave Ads:
1. Start any level
2. Complete 5 waves
3. Ad will show before the wave upgrade screen
4. Click "✕ Close Ad" to continue

### Test Refresh Ads:
1. Refresh the page once (counter = 1, no ad)
2. Refresh again (counter = 2, ad shows!)
3. Refresh again (counter = 3, no ad)
4. Refresh again (counter = 4, ad shows!)

### Reset Refresh Counter:
Open browser console and run:
```javascript
localStorage.setItem('dartdart_refresh_count', '0');
```

## Ad Flow Integration

### Wave Completion Flow:
```
Wave Complete → Check Ad Manager → Show Ad → User Closes → Wave Upgrade Screen
                    ↓ (no ad)
                    Wave Upgrade Screen
```

### Page Refresh Flow:
```
Page Load → Check Refresh Count → Show Ad → User Closes → Main Menu
                ↓ (no ad)
                Main Menu
```

## Customization

Edit `src/ads.js` to customize:
- `wavesUntilAd: 5` - Change frequency (default: every 5 waves)
- `refreshCount % 2 === 0` - Change refresh frequency (default: every 2 refreshes)
- `adVideos` array - Add/remove ad slots

## Future Monetization Ideas
- Reward ads (watch for extra lives/upgrades)
- Gems currency to skip ads
- Premium "No Ads" purchase
- Rewarded video for extra redraws
- Banner ads between screens
