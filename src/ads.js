// Ad Manager for DARTDART
// Handles ad display logic and tracking

export class AdManager {
  constructor() {
    this.adVideos = [
      "./assets/ads/ad1.mp4",
      "./assets/ads/ad2.mp4",
      "./assets/ads/ad3.mp4",
      "./assets/ads/ad4.mp4",
    ];

    this.wavesUntilAd = 5;
    this.wavesCompleted = 0;
    this.refreshCount = this.getRefreshCount();
    this.adShowing = false;

    this.incrementRefreshCount();
  }

  getRefreshCount() {
    try {
      const count = localStorage.getItem("dartdart_refresh_count");
      return count ? parseInt(count, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  incrementRefreshCount() {
    try {
      const newCount = this.refreshCount + 1;
      localStorage.setItem("dartdart_refresh_count", newCount.toString());
      this.refreshCount = newCount;
    } catch (e) {
      console.error("Failed to save refresh count:", e);
    }
  }

  resetRefreshCount() {
    try {
      localStorage.setItem("dartdart_refresh_count", "0");
      this.refreshCount = 0;
    } catch (e) {
      console.error("Failed to reset refresh count:", e);
    }
  }

  shouldShowAdOnRefresh() {
    // Show ad every 2 refreshes
    return this.refreshCount % 2 === 0 && this.refreshCount > 0;
  }

  onWaveComplete() {
    this.wavesCompleted++;

    // Show ad every 5 waves
    if (this.wavesCompleted % this.wavesUntilAd === 0) {
      return true;
    }

    return false;
  }

  getRandomAd() {
    const randomIndex = Math.floor(Math.random() * this.adVideos.length);
    return this.adVideos[randomIndex];
  }

  showAdWithButton(onClose) {
    if (this.adShowing) return;

    this.adShowing = true;

    // Create ad overlay with play button
    const overlay = document.createElement("div");
    overlay.id = "ad-overlay";
    overlay.className = "ad-overlay";

    // Create ad container
    const adContainer = document.createElement("div");
    adContainer.className = "ad-container";

    // Create ad icon/indicator
    const adIcon = document.createElement("div");
    adIcon.className = "ad-icon";
    adIcon.innerHTML = `
      <div class="ad-icon-content">
        <div class="ad-icon-symbol">📺</div>
        <div class="ad-icon-text">Advertisement</div>
      </div>
    `;

    // Create play button
    const playBtn = document.createElement("button");
    playBtn.className = "ad-play-btn";
    playBtn.innerHTML = "▶️ Watch Ad";
    playBtn.onclick = () => {
      this.playAd(overlay, adContainer, onClose);
    };

    // Create skip button
    const skipBtn = document.createElement("button");
    skipBtn.className = "ad-skip-btn";
    skipBtn.innerHTML = "✕ Skip";
    skipBtn.onclick = () => {
      this.closeAd(overlay, onClose);
    };

    adContainer.appendChild(adIcon);
    adContainer.appendChild(playBtn);
    adContainer.appendChild(skipBtn);
    overlay.appendChild(adContainer);
    document.body.appendChild(overlay);
  }

  playAd(overlay, container, onClose) {
    const adUrl = this.getRandomAd();
    console.log("Playing ad:", adUrl);

    // Clear container
    container.innerHTML = "";

    // Create video element
    const video = document.createElement("video");
    video.className = "ad-video";
    video.src = adUrl;
    video.autoplay = false;
    video.controls = true;
    video.playsInline = true;
    video.muted = false;
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("x5-playsinline", "true");

    // Handle video load
    video.onloadeddata = () => {
      console.log("Ad video loaded successfully");
    };

    // Handle video not found
    video.onerror = (e) => {
      console.error("Ad video error:", e);
      console.error("Failed to load:", adUrl);
      alert("Ad video not found. Continuing game...");
      this.closeAd(overlay, onClose);
    };

    // Create close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "ad-close-btn";
    closeBtn.textContent = "✕ Close Ad";
    closeBtn.onclick = () => {
      video.pause();
      this.closeAd(overlay, onClose);
    };

    // Auto-close when video ends
    video.onended = () => {
      this.closeAd(overlay, onClose);
    };

    container.appendChild(video);
    container.appendChild(closeBtn);

    // Try to play the video with user interaction
    setTimeout(() => {
      video
        .play()
        .then(() => {
          console.log("Ad playing successfully");
        })
        .catch((err) => {
          console.error("Failed to play ad:", err);
          // Video needs user interaction - show play button on video
          video.controls = true;
        });
    }, 100);
  }

  showAd(onClose) {
    this.showAdWithButton(onClose);
  }

  closeAd(overlay, onClose) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }

    this.adShowing = false;

    if (onClose) {
      onClose();
    }
  }

  checkAndShowAdOnRefresh(onClose) {
    if (this.shouldShowAdOnRefresh()) {
      // Small delay to let the page load
      setTimeout(() => {
        this.showAd(onClose);
      }, 1000);
      return true;
    }
    return false;
  }
}
