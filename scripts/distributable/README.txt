LEAGUE CLASSIC MATCH RECORDER — WINDOWS

WHAT IT DOES
Automatically watches League Classic 5v5 PvP matches and creates an uploadable
match.json after the match ends, including each tracked player's final inventory.
Final item slots are read from the League Client's completed-match record.
AI matches are ignored. The generated file is
marked for moderator review because live-client CS and vision can differ slightly
from the post-game scoreboard.

INSTALL
1. Extract the entire ZIP to a folder.
2. Double-click Install.cmd.

No player configuration is required. The recorder recognizes all nine Match
Archive Gamer Tags automatically.

The recorder appears in the Windows notification area and starts automatically
with Windows. Windows PowerShell 5.1 and curl.exe are included with current Windows
10 and Windows 11 installations. No Riot API key is required.

FILES
The newest upload-ready file is saved here:
  Documents\League Classic Match Captures\match.json

A dated copy is also retained in a subfolder for every captured match. Use
Open Captures.cmd to open this location.

TRAY CONTROLS
Right-click the recorder icon to see whether recording is enabled, pause or
resume recording, open captured matches, open the recorder log, or uninstall
the tool. Double-clicking the icon opens the capture folder. Matches played
while the recorder is paused are not captured.

IMPORTANT
- League and the League Client must be running normally.
- Only Classic Rift 5v5 PvP matches are exported.
- Custom/Co-op vs. AI matches are never exported.
- Keep the League Client open through the post-game transition so the recorder
  can retrieve the League-issued Game ID.
- Review the generated file on the website before publishing it.

UNINSTALL
Double-click Uninstall.cmd. Captured match files in Documents are preserved.
