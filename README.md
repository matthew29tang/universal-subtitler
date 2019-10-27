# Universal Subtitler
## Inspiration
Our team member enjoys watching Kdramas but has difficulty finding subtitles. In general, there is a lack of consistent video translation across online video platforms. Videos are minimally captioned/subtitled and beyond YouTube, it is largely nonexistent.

## What it does
Provides video subtitles to translate any language to any language

## How we built it
1. Extract the URL of the video using a Google Chrome extension
2. Download `mp4` video from url and split into 30sec segments
3. Convert `mp4` to `flac` (lossless audio) using `ffmpeg`
4. Create a transcript of the audio in the native language using Google Speech to Text API
5. Translate transcript to target language using Google Translate API
6. Inject captions to video player via Google Chrome extension

## Challenges we ran into
1. None of us have ever made a Google Chrome extension before so that was a learning experience for us all
2. Extracting the audio in <1min segments was challenging because Google's API requires the audio clips to be <1min
3. Extracting the video source links from the page was a difficult task

## Accomplishments that we're proud of
1. Everything works end to end
2. This is a utility that is quite practical and is ready to be used

## What we learned
1. Message passing in Chrome sandboxes (popup window vs page window)
2. Learning external programs like ffmpeg and using it with JavaScript
3. Learning WebVTT API to add subtitles to the video player
4. Learning how to interact with Google Speech to Text and Translate APIs

## What's next for usub
1. Streaming capabilities to process audio partitions asynchronously
2. Touching up styles/CSS