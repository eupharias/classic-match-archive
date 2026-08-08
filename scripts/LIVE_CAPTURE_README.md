# League Classic desktop capture

`watch-live-classic.ps1` runs quietly in the background and polls Riot's local Live Client Data API. It only creates imports for Classic Rift PvP matches (`JADE`, map 453) where every participant is human. Matches containing bots are ignored.

Completed captures are saved under:

`Documents\League Classic Match Captures\<timestamp>\match.json`

The newest capture is also copied to:

`Documents\League Classic Match Captures\match.json`

Use **Log match → Choose match.json** on the website to load the capture as an editable draft. Always compare CS and vision with the post-game scoreboard before publishing because the live endpoint can differ slightly from the final scoreboard.

## Player mapping

Edit `live-capture.config.json` when a Riot gamer tag changes or another archive player needs to be recognized. The recorder imports recognized players on the active player's team and ignores unrecognized players.

## Startup controls

- Run `install-live-capture.ps1 -StartNow` to install and start the recorder.
- Run `uninstall-live-capture.ps1` to remove automatic startup.
- The activity log is `Documents\League Classic Match Captures\recorder.log`.
