<a href="https://extension.js.org" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Powered%20by%20%7C%20Extension.js-0971fe" alt="Powered by Extension.js" align="right" /></a>

# RatioYT

> JavaScript-based extension with a sidebar panel. Adds a sidebar with a simple page.


![screenshot](./public/screenshot.png)
## Commands

### dev

Run the extension in development mode. Target a browser with `--browser`:

```bash
npm run dev
npm run dev -- --browser=firefox
npm run dev -- --browser=edge
```

### build

Build for production. Convenience scripts target each browser:

```bash
npm run build           # Chrome (default)
npm run build:firefox
npm run build:edge
```

### preview

Preview the production build in the browser:

```bash
npm run preview
```

## Learn more

[Extension.js docs](https://extension.js.org).



Devlog #1: Initial Design and goals

Whenever I look up neiche stuff on youtube, many times low quality clickbait pops up inn the feed, I was getting annoyed so i made this extension.
The goal is to bascially show some kind of % or rating at the bottom of the every tile in the yt homescreen, those values will be hte ratio of likes to dislikes

for this project these are the things im going to use
- Return youtube dislike API (since youtube stopped providing dislike data itself)
- Extension.js for cross browser Extensions
- Browser Storage API for caching API requests

Some extra features I would like to add would be
- A settings Popup
- hiding videos with low score
- Ability to use different rating quanitfiers

This is my first time making an extension, so far I have managed to setup the initial manifest.json and make a basic popup



next devlog tell users about alternatives

---




First things first I changed the project's name from `RatioYT` to `ThumbScore for YouTube` (I suck at naming things)

now as for the progress, I managed to inject placeholder text into youtube UI
and ngl that was more troublesome than I expected it to be.

when I inspecting the HTML it had so many tags and elements TWT
also the structure of videos arent consisitent throught the youtube system

there are different structers for the videos and shorts in these places
- Homepage
- Serach
- Shorts
- Playlists
- Mixes
- YT Channel Page
- Video Queues
- Playlist Queues

for now I think I managed to insert text in all these places programamtically.
But after doing this initial setup I found one major issue, There are too many videos, teh users will hit API rate limits if they try to fetch video data for each of them, I can add rate limits, but then the extension wont be responsive enough.

I have a plan for this isuues, but i'll first lookup online about similar implementaions before deciding on my plan of action.

