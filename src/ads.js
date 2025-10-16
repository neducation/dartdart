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

  showAd(onClose) {
    if (this.adShowing) return;

    this.adShowing = true;
    const adUrl = this.getRandomAd();

    // Create ad overlay
    const overlay = document.createElement("div");
    overlay.id = "ad-overlay";
    overlay.className = "ad-overlay";

    // Create video element
    const video = document.createElement("video");
    video.className = "ad-video";
    video.src = adUrl;
    video.autoplay = true;
    video.controls = false;
    video.playsInline = true;

    // Handle video not found
    video.onerror = () => {
      console.warn("Ad video not found:", adUrl);
      this.closeAd(overlay, onClose);
    };

    // Create close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "ad-close-btn";
    closeBtn.textContent = "✕ Close Ad";
    closeBtn.onclick = () => {
      this.closeAd(overlay, onClose);
    };

    // Create skip timer (show close button immediately)
    closeBtn.style.display = "block";

    // Auto-close when video ends
    video.onended = () => {
      this.closeAd(overlay, onClose);
    };

    overlay.appendChild(video);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    // Try to play the video
    video.play().catch((err) => {
      console.error("Failed to play ad:", err);
      this.closeAd(overlay, onClose);
    });
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
