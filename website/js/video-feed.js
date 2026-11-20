/**
 * OmniQ — Dynamic Account Video Feed Loader
 * 
 * Automatically fetches and displays the latest videos / reels from your
 * official YouTube Channel or Instagram Business account.
 * 
 * Instructions:
 * 1. For YouTube:
 *    - Get a free API Key from Google Cloud Console (APIs & Services > Credentials).
 *    - Enable "YouTube Data API v3".
 *    - (Recommended) Restrict the key's HTTP referrer to your domain (e.g. https://www.macstudio.in/* and http://localhost:*).
 *    - Put your Channel ID (starts with "UC...") or Uploads Playlist ID (starts with "UU...").
 * 
 * 2. For Instagram:
 *    - Get a Long-Lived User Access Token via Meta for Developers (Instagram Graph API).
 *    - Paste it in the instagram.accessToken field below.
 */

const VIDEO_FEED_CONFIG = {
  // Set to 'youtube', 'instagram', or 'none' (uses static cards)
  platform: 'youtube',

  youtube: {
    enabled: true,
    // Paste your Google Cloud YouTube Data API v3 key here:
    apiKey: '',
    // Paste your YouTube Channel ID (starts with UC...) or Uploads Playlist ID (UU...):
    channelId: '',
    // Maximum number of latest videos to display:
    maxResults: 6
  },

  instagram: {
    enabled: false,
    // Paste your Meta / Instagram Long-Lived Access Token here:
    accessToken: '',
    maxResults: 6
  }
};

(function () {
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderFeedCards(items) {
    const grid = document.getElementById('videoGrid');
    if (!grid || !items || !items.length) return;

    grid.innerHTML = items.map(item => `
      <div class="video-card" 
           data-platform="${item.platform}" 
           ${item.videoId ? `data-video-id="${escapeHtml(item.videoId)}"` : ''} 
           ${item.reelId ? `data-reel-id="${escapeHtml(item.reelId)}"` : ''}
           ${item.videoUrl ? `data-video-url="${escapeHtml(item.videoUrl)}"` : ''}
           data-customer="${escapeHtml(item.customer)}" 
           data-location="${escapeHtml(item.location)}" 
           data-quote="${escapeHtml(item.quote)}">
        <div class="video-card-inner">
          <img class="video-poster" 
               src="${escapeHtml(item.thumbnail)}" 
               alt="${escapeHtml(item.title)}" 
               loading="lazy" 
               width="540" 
               height="960" 
               style="width:100%;height:100%;object-fit:cover;display:block;">
          <div class="platform-pill pill-${item.platform}">
            <span>${item.platform === 'youtube' ? 'YouTube' : 'Instagram'}</span>
          </div>
          <button class="play-trigger" aria-label="Play video">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <div class="video-card-overlay">
            <div class="rating-stars">★★★★★</div>
            <p class="quote">"${escapeHtml(item.quote)}"</p>
            <div class="customer-info">
              <strong>${escapeHtml(item.customer)}</strong>
              <span>${escapeHtml(item.location)}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  async function fetchYouTubeFeed() {
    const { apiKey, channelId, maxResults } = VIDEO_FEED_CONFIG.youtube;
    if (!apiKey || !channelId) {
      console.info('[OmniQ Video Feed] YouTube API Key or Channel ID not set in js/video-feed.js. Displaying default customer stories.');
      return false;
    }

    try {
      // Convert channel ID (UC...) to Uploads playlist ID (UU...) for high-efficiency quota (1 unit vs 100 units)
      let playlistId = channelId.trim();
      if (playlistId.startsWith('UC')) {
        playlistId = 'UU' + playlistId.substring(2);
      }

      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&maxResults=${maxResults || 6}&key=${encodeURIComponent(apiKey.trim())}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`YouTube API returned status ${res.status}`);
      }
      const data = await res.json();
      if (!data.items || !data.items.length) {
        console.warn('[OmniQ Video Feed] No videos found in YouTube playlist:', playlistId);
        return false;
      }

      const items = data.items.map(item => {
        const snippet = item.snippet;
        const thumbs = snippet.thumbnails || {};
        const thumbnail = thumbs.maxres?.url || thumbs.high?.url || thumbs.medium?.url || 'assets/video-thumbs/thumb-youtube.png';
        const title = snippet.title || 'Customer Feedback';

        return {
          platform: 'youtube',
          videoId: snippet.resourceId?.videoId,
          title: title,
          quote: title.length > 75 ? title.substring(0, 72) + '...' : title,
          customer: snippet.channelTitle || 'OmniQ Customer',
          location: 'Verified Video',
          thumbnail: thumbnail
        };
      });

      renderFeedCards(items);
      console.info(`[OmniQ Video Feed] Successfully loaded ${items.length} live videos from YouTube channel!`);
      return true;
    } catch (err) {
      console.warn('[OmniQ Video Feed] Error fetching YouTube videos, keeping default customer stories:', err.message);
      return false;
    }
  }

  async function fetchInstagramFeed() {
    const { accessToken, maxResults } = VIDEO_FEED_CONFIG.instagram;
    if (!accessToken) {
      console.info('[OmniQ Video Feed] Instagram Access Token not set in js/video-feed.js.');
      return false;
    }

    try {
      const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${encodeURIComponent(accessToken.trim())}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Instagram API returned status ${res.status}`);
      }
      const data = await res.json();
      if (!data.data || !data.data.length) return false;

      const videoList = data.data.filter(m => m.media_type === 'VIDEO' || m.thumbnail_url).slice(0, maxResults || 6);
      if (!videoList.length) return false;

      const items = videoList.map(item => {
        const caption = item.caption || 'OmniQ Customer Story';
        return {
          platform: 'instagram',
          reelId: item.permalink?.split('/reel/')[1]?.replace(/\//g, '') || item.id,
          videoUrl: item.permalink,
          title: caption,
          quote: caption.length > 75 ? caption.substring(0, 72) + '...' : caption,
          customer: 'OmniQ Community',
          location: 'Instagram Reel',
          thumbnail: item.thumbnail_url || item.media_url || 'assets/video-thumbs/thumb-instagram.png'
        };
      });

      renderFeedCards(items);
      console.info(`[OmniQ Video Feed] Successfully loaded ${items.length} live videos from Instagram!`);
      return true;
    } catch (err) {
      console.warn('[OmniQ Video Feed] Error fetching Instagram feed:', err.message);
      return false;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (VIDEO_FEED_CONFIG.platform === 'youtube' && VIDEO_FEED_CONFIG.youtube.enabled) {
      fetchYouTubeFeed();
    } else if (VIDEO_FEED_CONFIG.platform === 'instagram' && VIDEO_FEED_CONFIG.instagram.enabled) {
      fetchInstagramFeed();
    }
  });
})();

