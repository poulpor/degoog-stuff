# Animated Background for DeGoog

A plugin that displays an animated MP4 video as the home page background.

The video is downloaded once, cached locally, and served by the plugin. An optional gradient can improve readability of FreshRSS plugin over the background.

## Features

- Displays a looping, muted MP4 video on the DeGoog home page
- Downloads the video once and caches it locally. Entering another video url replaces the local mp4 file.
- Optional bottom gradient for better readability
- Supports direct MP4 URLs
- Maximum video size: 20 MB
- Optional allowlist for one local-network video host


## Local video hosting

By default, local-network URLs are blocked for security reasons.
To use a video hosted on your local network, enter the exact hostname or IP address in **Allowed local video host**, for example:

```text
192.168.1.50
```

Then use a direct MP4 URL such as:
```text
http://192.168.1.50/videos/background.mp4
```

## Cache

The downloaded video is stored at:

```text
data/animated-background/animated_background.mp4
```

Plugin state is stored at:

```text
data/animated-background/state.json
```

To force a new download, delete both files and restart DeGoog:

```bash
rm -f data/animated-background/animated_background.mp4
rm -f data/animated-background/state.json
```

## Notes

- Use a direct link to an MP4 file; pages such as YouTube or Google Drive links are not supported.
- The video is muted and loops automatically.
- The plugin is intended for the DeGoog home page.
