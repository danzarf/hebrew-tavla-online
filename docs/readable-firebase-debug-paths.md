# Readable Firebase Debug Paths

Trusted Stats writes the existing production paths without renaming them:

```text
recentMatches/{matchId}
playerStats/{uid}
matchResultSubmissions/{uid}/{matchId}
```

It also writes server-only readable shortcuts for manual checks:

```text
debugLatestMatch
debugLatestRealMatch
debugLatestDiagnosticMatch
readableMatches/{matchNumber}
```

After a real online game, check:

```text
Firebase -> Realtime Database -> debugLatestRealMatch
```

The node should show:

```text
readableName
matchId
roomCode
winnerName
loserName
statsSchemaVersion
hasPlayerMatchStats
serverReviewStatus
trustedStatsApplied
playerMatchStats
```

Diagnostic workflow runs update `debugLatestDiagnosticMatch`. They should not overwrite
`debugLatestRealMatch`, so the latest real production game remains easy to find.

All readable debug paths are server-written only. Clients must not write to them.
