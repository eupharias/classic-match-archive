LEAGUE CLASSIC MATCH RECORDER — WINDOWS

WHAT IT DOES
Automatically watches League Classic 5v5 PvP matches and creates an uploadable
match.json after the match ends, including each tracked player's final inventory.
AI matches are ignored. The generated file is
marked for moderator review because live-client CS and vision can differ slightly
from the post-game scoreboard.

INSTALL
1. Extract the entire ZIP to a folder.
2. Double-click Install.cmd.
3. Enter your League Gamer Tag exactly as it appears in game.
4. Enter your player name as it appears in the Match Archive.

The recorder runs silently in the background and starts automatically with
Windows. Windows PowerShell 5.1 and curl.exe are included with current Windows
10 and Windows 11 installations. No Riot API key is required.

FILES
The newest upload-ready file is saved here:
  Documents\League Classic Match Captures\match.json

A dated copy is also retained in a subfolder for every captured match. Use
Open Captures.cmd to open this location.

IMPORTANT
- League and the League Client must be running normally.
- Only Classic Rift 5v5 PvP matches are exported.
- Custom/Co-op vs. AI matches are never exported.
- Keep the League Client open through the post-game transition so the recorder
  can retrieve the League-issued Game ID.
- Review the generated file on the website before publishing it.

UNINSTALL
Double-click Uninstall.cmd. Captured match files in Documents are preserved.
