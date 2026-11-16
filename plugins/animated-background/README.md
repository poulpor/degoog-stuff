# Animated Background for degoog

A plugin that displays an animated MP4 video as the main home page background.

The video is downloaded once, cached locally, and served by the plugin. An optional gradient can improve readability of FreshRSS plugin over the background.

## Features

- Displays a looping, muted MP4 video on the Degoog home page
- Downloads the video once and caches it locally. Entering another video url replaces the local mp4 file.
- Optional bottom gradient for better readability
- Supports direct MP4 URLs
- Maximum video size: 20 MB
- **Local and private-network URLs are not allowed.**


## Local video hosting

Place one or more videos in degoog’s `/data/animated_background/my_live_wallpapers` folder. With multiple videos, you can shuffle between them randomly after a timed delay. To switch to this local option, you must clear the remote video field.

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
