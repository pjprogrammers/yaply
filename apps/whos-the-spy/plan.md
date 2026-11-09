Yaply – Who's the Spy: Complete Game Rules & Implementation Specification

Game design specification
 Online multiplayer + voice chat

The version you want to build is the word-based social deduction game, like WePlay's Who's the Spy, not the Werewolf/Mafia game.

The central concept:
- Almost everyone receives the same secret word.
- One or more players receive a different, related word.
- Players give clues about their words without revealing them.
- Everyone listens to the clues, chats, discusses and tries to identify the spy.
- Players vote to eliminate someone.
- The game continues until one team wins.
WePlay officially describes its game as identifying the player with a different word. Its app also promotes voice-powered gameplay and social interaction. 

WePlay+2

Important distinction: WePlay does not publicly document its complete internal game engine, exact voting timers, word database, matchmaking algorithms or every regional/version-specific setting. So I can give you a detailed WePlay-style specification, based on its publicly described mechanics and observable gameplay references, but I won't pretend undocumented settings are verified WePlay rules.

1. Basic game concept






















6














Imagine there are six players:
Player	Secret word	Role
Player 1	Cappuccino	Civilian
Player 2	Cappuccino	Civilian
Player 3	Cappuccino	Civilian
Player 4	Espresso	Spy
Player 5	Cappuccino	Civilian
Player 6	Cappuccino	Civilian

The players don't know who has which role.

The spy knows their own different word, but doesn't know the civilians' word.

The civilians know their own word, but don't know the spy's word.

The objective:
- Civilians: Identify and eliminate all spies.
- Spy: Blend in, avoid elimination and eliminate suspicion.
For example:
- Player 1 says: "Morning."
- Player 2 says: "Coffee."
- Player 3 says: "Milk."
- Player 4 says: "Strong."
- Player 5 says: "Cafe."
- Player 6 says: "Hot."
Player 4 might look suspicious, but their clue isn't necessarily wrong. That's the fun of the game.
2. Player count and room configuration
For Yaply, I recommend the following configuration.
Setting	Recommended implementation
Minimum players	3
Maximum players	12
Default players	6
Default spies	1
Multiple spies	Optional
Game type	Multiplayer
Communication	Text + voice
Word assignment	Automatic
Voting	Private voting
Rounds	Until a winning condition
Host	Room creator

Recommended spy count:
Total players	Spies
3–5	1
6–8	1
9–11	2
12	2

Make spy count configurable by the host, with validation that civilians always outnumber spies.

The host should be able to configure these settings before starting a game.
3. Categories and secret words






















7











This is one of the most important parts of the game.

The host selects one or more categories. The game server randomly selects a word pair from those categories.

For example:
Category	Civilian word	Spy word
Food	Pizza	Burger
Drinks	Coffee	Tea
Animals	Tiger	Lion
Transport	Train	Metro
Technology	Laptop	Tablet
Places	Hospital	School
Sports	Football	Basketball
Nature	Ocean	Lake
Clothing	Jacket	Hoodie
Entertainment	Movie	TV Show

The two words should be related enough that the spy can reasonably participate, but different enough that their clues can expose them.
Recommended category collection
1. Food & Drinks
2. Animals
3. Countries & Cities
4. Places & Buildings
5. Technology
6. Sports
7. Movies & Entertainment
8. Professions
9. School & Education
10. Household Items
11. Vehicles & Transport
12. Nature
13. Clothing & Fashion
14. Famous People
15. Brands
16. Games
17. Everyday Life
18. Music
19. Internet & Social Media
20. Mixed / Random
Word-pair selection rules
Your backend should:
- Select words from the category or categories selected by the host.
- Select a valid related pair.
- Randomly decide which word belongs to civilians and which belongs to spies.
- Randomly select the spy player or players.
- Avoid repeating recently used pairs in the same room.
- Never reveal either word to another player.
- Ensure the two words are not identical.
- Avoid ambiguous or inappropriate words where possible.
Important: Randomly swapping the two words is necessary. Otherwise, players could learn that the first word always belongs to civilians.
4. Secret role and word distribution
This phase must be handled privately by the server.

There are two essential roles.










CIVILIAN
Majority team
- Receives the civilian secret word.
- Must give clues related to that word.
- Must identify the spy.
- Must not directly reveal the secret word.













SPY
Hidden role
- Receives the spy's different word.
- Must pretend to have the same word as everyone else.
- Must listen to other players' clues.
- Must avoid getting voted out.



Distribution algorithm
Suppose the room has eight players and two spies.
1. Get the eight eligible players.
2. Randomly select two spy players.
3. Select a word pair, such as Beach and Swimming Pool.
4. Randomly choose which word is assigned to the civilian team.
5. Give six players the civilian word.
6. Give two players the spy word.
7. Send each player only their own secret role and word.
The server must never send the complete role distribution to all clients.

Example private payload:
{
  "type": "ROLE_ASSIGNED",
  "role": "spy",
  "word": "Swimming Pool",
  "category": "Places"
}


Another player might receive:
{
  "type": "ROLE_ASSIGNED",
  "role": "civilian",
  "word": "Beach",
  "category": "Places"
}


The category is shared, but the words are different.
Role reveal screen
When the round begins:
- Show a private role-reveal screen.
- Display the category.
- Display the player's assigned word.
- Display their role.
- Keep the word hidden from other players.
- Provide a button to continue to the game.
The secret word must never appear in the public room chat, public game state, browser URL, player list or public WebSocket broadcast.
5. Complete gameplay phases
This is the proposed complete game lifecycle for Yaply.
Game lifecycle
1. Room lobby
   
   Players join, select categories and configure game settings.
2. Game starts
   
   Server checks player count and assigns secret roles and words.
3. Secret word reveal
   
   Each player privately sees their own word.
4. Clue / discussion phase
   
   Players take turns describing their words. Everyone can communicate through voice and text.
5. Voting phase
   
   All eligible players privately select someone they suspect.
6. Vote result
   
   The server counts votes and identifies the eliminated player.
7. Role reveal
   
   The eliminated player's role is revealed.
8. Next round or game result
   
   Continue if the game isn't over. Otherwise display the winning team.

Phase A: Lobby
The host creates a room and invites friends.

Each player should have:
- Avatar
- Username
- Ready indicator
- Voice connection status
- Microphone mute status
- Player slot
Host settings:
Setting	Suggested options
Categories	Multiple selection
Spy count	1–3
Clue time	30–90 seconds
Discussion time	30–120 seconds
Voting time	15–45 seconds
Reveal role after elimination	On
Spy final guess	On/Off
Voice chat	On/Off
Text chat	On/Off

The host presses Start Game.

Server validation:
- Enough players are connected.
- All required settings are valid.
- The host is authorized to start.
- There are enough civilians.
- The word bank contains a valid pair.
Once started, freeze the round's settings.
Phase B: Secret word reveal
Each player sees their assigned word privately.

For example:
CIVILIAN
Beach
Category: Places
Your secret word

SPY
Swimming Pool
Category: Places
Your secret word


Players press Continue after memorizing their word.

Do not reveal other players' roles or words.
Phase C: Clue and discussion phase
This is the heart of the game.

Each player must give a clue that relates to their assigned word.

For example:
Player	Word	Clue
A	Beach	Sand
B	Beach	Summer
C	Beach	Waves
D	Swimming Pool	Chlorine
E	Beach	Holiday
F	Beach	Ocean

Player D's clue might expose them.

However, the clue should not be so obvious that it reveals the entire word to the spy.
Turn order
I recommend a randomly selected starting player.

For example:
1. Player C starts.
2. Player D speaks next.
3. Player E speaks next.
4. Player F speaks next.
5. Player A speaks next.
6. Player B speaks last.
Every player gets one turn.

After the first clue cycle, players can have a discussion period.
Rules for clues
- Do not directly say your secret word.
- Do not spell the secret word.
- Do not give away the complete answer.
- Give a relevant description or association.
- Avoid intentionally revealing another player's word.
- Do not repeat another player's exact clue simply to avoid answering.
For Yaply, support two clue formats:

1. Free speech

Players can speak naturally through voice chat.

2. Text clue

Players can submit a short written clue.

The server should track whether each player has submitted their clue, so a player cannot submit multiple clues during the same turn.
Discussion
After everyone has given a clue:
- Players can openly discuss.
- They can question suspicious players.
- They can explain why their clues make sense.
- They can accuse someone.
- They can defend themselves.
- They can use voice chat and text chat.
A timer ends the discussion automatically.

I recommend 45 seconds initially, with the host able to adjust it.

Voice and text chat should remain available throughout the discussion.
Phase D: Voting






















10











When discussion ends, the game enters voting mode.

Every eligible player receives the same voting interface.

Example:
Who is the Spy?
Voting

00:25
Select the player you suspect.
Player A
Player B
Player C
Player D
Player E
Player F

Confirm vote (preview)Illustrative voting interface, not a live game.
Voting rules
1. Every living player gets one vote.
2. Players cannot vote for themselves.
3. Players cannot change their vote after confirmation.
4. Votes remain private until the voting period ends.
5. Players who have already been eliminated cannot vote.
6. The server counts the votes.
7. The player with the highest number of votes is eliminated.
What happens when votes are tied?
I recommend this rule:
- If one player has the highest vote count, eliminate that player.
- If two or more players tie for the highest count, initiate a revote between those players.
- Give players 15 seconds to discuss the tied candidates.
- Allow one revote.
- If the revote is still tied, nobody is eliminated that round.
This avoids arbitrary eliminations.
What if someone doesn't vote?
Set a voting deadline.

If a player fails to vote:
- Their vote is recorded as abstain.
- They are not automatically eliminated.
- The round continues.
- Repeated inactivity can be handled by room AFK rules.
Example
Player	Vote
A	D
B	D
C	D
D	A
E	D
F	B

Result:
Player D eliminated
Four votes were received against Player D.
Phase E: Elimination and role reveal
After the voting result, the eliminated player is removed from active gameplay.

Their role is revealed.

For example:
Player D was eliminated!
THE SPY
The players successfully identified the spy.


Secret word

Swimming Pool

Civilian word

Beach


The role reveal should be public, but the eliminated player's secret word should only be revealed according to your chosen game rules.

My recommendation: reveal the role immediately, but reveal both words only when the game ends.
Eliminated player behaviour
This is important for multiplayer implementation.

After elimination:
- Player cannot vote.
- Player cannot submit clues.
- Player cannot participate in active gameplay.
- Player remains in the room.
- Player can continue listening to voice chat.
- Player can use spectator chat.
- Player cannot reveal the secret word to active players.
I recommend separating active players and eliminated spectators visually.
Phase F: Continue the game
If there are still spies alive, and the game has not reached its end condition:
1. Start another clue round.
2. Select a new random starting player from eligible players.
3. Continue with remaining players.
4. Allow discussion.
5. Start another vote.
6. Repeat until a team wins.
Important: The words and roles remain the same throughout a single game. Don't assign new words every voting round.

This maintains the deduction aspect.
6. Winning conditions
This is one of the most important parts to implement correctly.
Civilian victory
Civilians win when all spies have been eliminated.

Example:
- 6 civilians and 2 spies initially.
- First spy gets eliminated.
- Second spy gets eliminated.
- Civilians win.
Spy victory
For a clean default ruleset, the spy team wins when the number of remaining spies equals or exceeds the number of remaining civilians.

Example:
Civilians alive	Spies alive	Result
5	1	Continue
4	1	Continue
3	2	Continue
2	2	Spies win
1	2	Spies win
0	1	Spies win

This is a recommended balancing rule, not a verified WePlay-specific threshold.
Optional: Spy final word guess
I strongly recommend implementing an optional final-guess mechanic.

When a spy is eliminated, give them one chance to guess the civilian word.

Example:
- Spy's word: Swimming Pool.
- Civilian word: Beach.
- Spy has been eliminated.
- Show a private guess interface.
- Spy enters: Beach.
If correct, the spy steals the victory.

If incorrect, the civilians win, provided all spies have been eliminated.

For multiple spies, I recommend enabling this only for the final eliminated spy, or making the host choose the variant before the game starts.

This makes the game more exciting because the spy can still win even when caught.

7. Text chat and voice chat
Since you specifically like WePlay's combination of text and voice, this should be a first-class part of Yaply's game rather than an optional add-on.






















7











Voice chat behaviour
I recommend one persistent voice room per game room.
Game phase	Voice behaviour
Lobby	All players can talk
Word reveal	Players can talk, but their word remains private
Clue phase	All active players can talk
Discussion	All active players can talk
Voting	Voice disabled temporarily
Vote reveal	Voice enabled
Elimination	Eliminated players become spectators
Results	Everyone can talk

Voting voice restrictions are my suggested competitive rule, not a confirmed WePlay setting.
Microphone controls
Every player should have:
- Microphone mute/unmute.
- Speaker mute/unmute.
- Voice connection indicator.
- Speaking animation.
- Network connection indicator.
Host controls:
- Mute everyone.
- Remove a player.
- Disable voice chat.
- Re-enable voice chat.
Text chat
Use separate message categories:
Message type	Display
Normal message	Regular chat bubble
System message	System-styled notification
Accusation	Optional highlighted message
Player eliminated	System notification
Voting started	System notification
Game result	Result notification

For example:
[System] Discussion has started.

[Player A] I think D is suspicious.
[Player B] Why?
[Player A] Their clue doesn't match.
[Player D] I was describing the same thing.
[Player C] I agree with A.

[System] Voting starts in 10 seconds.


Important chat security
Never let an eliminated player communicate the secret word to active players.

Possible solutions:
- Separate active and spectator chat.
- Disable spectator chat until the game finishes.
- Allow spectators to communicate only with other spectators.
I recommend the third approach for competitive fairness.
8. Player interface and screen layout
For Yaply, I would use a fixed viewport game layout, similar to your Skribbl approach, rather than a page that grows as messages accumulate.














Desktop layout
Suggested structure:
YAPLY · WHO'S THE SPY
LIVE

Room: YP4821 · Discussion phase · 00:35

Players

Alex

Online



Sam

Online



Jordan

Speaking



Chris

Online



Taylor

Muted



Jamie

Online




Discussion is in progress

Listen carefully and find the spy.

Mic on
Speaker on



Game chat
Alex

I suspect Chris.

Sam

Why?


Type a message...




Discussion timer

00:35


Conceptual layout to illustrate the information hierarchy, not a recreation of WePlay's screen.
Mobile layout
For mobile, prioritize:
1. Top 8–10%: game title, room code, phase and timer.
2. Next 35–40%: player avatars, usernames and speaking indicators.
3. Next 20–25%: active game content, clues or voting controls.
4. Next 20–25%: chat and discussion.
5. Bottom 8–10%: microphone, speaker and message controls.
These are starting proportions, not rigid dimensions. Use a viewport-constrained layout and adapt the chat region depending on the phase.
Player card information
Each player card should show:
- Avatar.
- Complete username.
- Microphone status.
- Speaking animation.
- Connection status.
- Host indicator.
- Eliminated indicator, if applicable.
Do not show anyone's secret role on the player cards before the appropriate reveal.
9. Game settings I recommend for Yaply
These are the options I would expose in the host settings panel.
Setting	Options	Default
Category	Multiple categories	Mixed
Spy count	1–3	Automatic
Clue format	Voice / Text / Both	Both
Clue timer	30 / 45 / 60 / 90 sec	45 sec
Discussion timer	30 / 45 / 60 / 90 sec	45 sec
Voting timer	15 / 20 / 30 / 45 sec	30 sec
Role reveal	On / Off	On
Final spy guess	On / Off	On
Voice chat	On / Off	On
Spectator chat	On / Off	Off

I would also include three difficulty options:
- Easy: Words are noticeably related but easier to distinguish.
- Normal: Words are closely related.
- Hard: Words are extremely similar, making it difficult for civilians to identify spies.
For example:
Difficulty	Civilian word	Spy word
Easy	Dog	Elephant
Normal	Coffee	Tea
Hard	Cappuccino	Latte

The word-pair database should define difficulty explicitly instead of relying on an algorithm to guess similarity.
10. Points and scoring system
I recommend adding points after the main game works.

An example scoring system:
Action	Points
Civilian correctly votes for spy	'+100
Civilian votes incorrectly	0
Spy survives and wins	'+150
Spy correctly guesses civilian word	'+100 bonus
Spy gets eliminated	0
Winning civilian team	'+50
Winning spy team	'+50

These are proposed Yaply values, not WePlay's confirmed scoring formula.
Individual scoring
For example, suppose there are six civilians and one spy.

The civilians catch the spy.
- Civilians who voted for the spy: +100 each.
- Civilians who voted incorrectly: 0.
- Spy: 0.
- Every civilian: +50 team-win bonus.
This gives players an individual reason to participate in voting rather than simply following the majority.

You can later add:
- XP.
- Levels.
- Daily missions.
- Win streaks.
- Total games played.
- Spy win percentage.
- Civilian win percentage.
- Most accurate voter.
Keep these separate from actual game logic.

11. Important edge cases and exact behaviour
These are the situations that often cause multiplayer games to break.
Situation	Expected behaviour
Host leaves during lobby	Transfer host or close room
Host disconnects during game	Pause briefly and transfer control
Player disconnects	Mark disconnected and allow reconnection
Player reconnects	Restore their role and game state privately
Player leaves permanently	Mark as departed; recalculate win conditions
Player disconnects during voting	Their vote is treated as missing
Player disconnects after voting	Preserve their submitted vote
All players disconnect	Pause and eventually expire room
Duplicate vote request	Reject it
Late vote request	Reject it
Invalid player ID	Reject it
Player tries to vote for themselves	Reject it
Player tries to vote while eliminated	Reject it
Player sends multiple clues	Reject extra submissions
Timer expires	Advance automatically
Two players tie	Trigger revote
Revote ties	Nobody eliminated
No valid word pair	Do not start game

Reconnection is especially important
A player who refreshes their browser should not receive a new role or word.

Store their assigned role securely in the server's room state.

When they reconnect, restore the same role and current game phase.

Never redistribute words simply because a player reconnected.
12. Anti-cheat and security requirements
Because this is a social deduction game, the server must be authoritative.

Do not let clients decide:
- Who the spy is.
- Which word belongs to civilians.
- Which word belongs to the spy.
- Whether someone was eliminated.
- Whether a vote is valid.
- Whether the game has ended.
The client should only request actions. The server validates and processes them.
Important security rules
1. Secret roles must be stored server-side.
2. Secret words must be sent only to their respective players.
3. Votes must be stored server-side.
4. Voting results must not be exposed before the voting deadline.
5. Clients must not be allowed to modify game timers.
6. Clients must not be allowed to modify their role.
7. A player must not submit another player's vote.
8. A player must not submit actions for a different room.
9. The server must validate every phase transition.
10. Use cryptographically secure randomness for spy selection and word assignment.
Also rate-limit chat and game actions to prevent spam and automated abuse.
13. Technical architecture for Yaply
You already have the Yaply architecture with Cloudflare Workers, Durable Objects and the GAME_ROOMS system. I would implement Who's the Spy as another game type in that existing architecture rather than creating another independent multiplayer server.
Yaply multiplayer architecture
Yaply Web / Mobile PWA

Game UI · Chat · Voice controls · Voting


Shared realtime client

WebSocket · Game actions · State updates


Cloudflare Worker

Authentication · Validation · Routing


GAME_ROOMS Durable Object

Authoritative game state · Roles · Words · Votes · Timers

Word database

Categories and pairs


Voice provider

WebRTC / SFU




Suggested game state
type SpyGamePhase =
  | "lobby"
  | "role_reveal"
  | "clue"
  | "discussion"
  | "voting"
  | "revote"
  | "elimination"
  | "final_guess"
  | "results";

interface SpyGameState {
  roomId: string;
  phase: SpyGamePhase;
  round: number;

  settings: {
    spyCount: number;
    categories: string[];
    clueTime: number;
    discussionTime: number;
    votingTime: number;
    finalGuessEnabled: boolean;
  };

  players: Array<{
    playerId: string;
    username: string;
    connected: boolean;
    eliminated: boolean;
  }>;

  activeSpeakerId: string | null;
  turnOrder: string[];
  currentClues: Record<string, string>;
  votes: Record<string, string>;
  deadline: number | null;
}


Notice that the public state doesn't contain the secret roles or secret words.

Keep private assignments in a separate server-only structure:
interface PrivateSpyAssignments {
  [playerId: string]: {
    role: "civilian" | "spy";
    word: string;
  };
}


The server constructs a different private response for each player.
Suggested WebSocket events
Event	Direction	Purpose
spy:create	Client → Server	Create game
spy:join	Client → Server	Join game
spy:ready	Client → Server	Ready status
spy:start	Client → Server	Start game
spy:role	Server → Individual	Private role
spy:phase	Server → All	Phase change
spy:clue	Client → Server	Submit clue
spy:clue_update	Server → All	Public clue
spy:vote	Client → Server	Cast vote
spy:vote_progress	Server → All	Voting completion count
spy:elimination	Server → All	Elimination result
spy:revote	Server → All	Tie handling
spy:final_guess	Client → Server	Submit final guess
spy:results	Server → All	Final results

Use your existing shared Zod protocol package to validate these events. Every action should include a room ID, player identity, game ID and request ID.
14. Voice infrastructure: important technical decision
Your existing Cloudflare Durable Object should manage game state, not carry voice audio.

Use two separate systems:
System	Responsibility
Cloudflare Worker + Durable Object	Game rules, rooms, timers, chat, votes
WebRTC	Real-time audio transmission

For voice:
- A peer-to-peer WebRTC mesh can work for small groups, but each participant sends audio to every other participant.
- An SFU (Selective Forwarding Unit) is more suitable for larger rooms because each participant sends one audio stream to the server, which forwards it to others.
- Keep microphone controls independent of game state.
- Use TURN fallback for users behind restrictive NATs and firewalls.
Do not try to implement voice transmission using ordinary WebSockets.

For the initial Yaply release, I would build the game engine and text chat first, then integrate voice as a separate subsystem.
15. Exact game algorithm
Here is the overall server-side logic.

async function startSpyGame(room) {
  validatePlayerCount(room);
  validateSettings(room);

  const players = getEligiblePlayers(room);
  const wordPair = selectWordPair(
    room.settings.categories,
    room.settings.difficulty,
    room.recentWordPairs
  );

  const assignments = assignRolesSecurely(
    players,
    room.settings.spyCount
  );

  const civilianWord = randomBoolean()
    ? wordPair.wordA
    : wordPair.wordB;

  const spyWord = civilianWord === wordPair.wordA
    ? wordPair.wordB
    : wordPair.wordA;

  for (const player of players) {
    const role = assignments[player.id];

    room.privateAssignments[player.id] = {
      role,
      word: role === "spy" ? spyWord : civilianWord
    };

    sendPrivate(player.id, {
      type: "ROLE_ASSIGNED",
      role,
      word: room.privateAssignments[player.id].word,
      category: wordPair.category
    });
  }

  room.phase = "clue";
  room.round = 1;
  room.activePlayers = players.map(p => p.id);
  room.turnOrder = shuffle(players.map(p => p.id));

  broadcastPublicState(room);
}

function finishVoting(room) {
  const validVotes = getValidVotes(room);
  const result = countVotes(validVotes);

  if (result.isTie) {
    startRevote(room, result.tiedPlayers);
    return;
  }

  const eliminatedId = result.playerId;

  eliminatePlayer(room, eliminatedId);

  const role = room.privateAssignments[eliminatedId].role;

  broadcast({
    type: "PLAYER_ELIMINATED",
    playerId: eliminatedId,
    role
  });

  checkWinner(room);
}

function checkWinner(room) {
  const alive = room.activePlayers;

  const spies = alive.filter(
    id => room.privateAssignments[id].role === "spy"
  );

  const civilians = alive.length - spies.length;

  if (spies.length === 0) {
    finishGame(room, "civilians");
    return;
  }

  if (spies.length >= civilians) {
    finishGame(room, "spies");
    return;
  }

  startNextClueRound(room);
}



This is the basic algorithm, not production-ready code. Your production implementation must additionally handle final guesses, multiple spies, ties, departures, reconnects, timer races and idempotent actions.
16. Suggested database and word-bank structure
Your word bank should be separate from room state.

Example:
{
  "category": "Food & Drinks",
  "pairs": [
    {
      "id": "food-001",
      "wordA": "Pizza",
      "wordB": "Burger",
      "difficulty": "easy"
    },
    {
      "id": "food-002",
      "wordA": "Coffee",
      "wordB": "Tea",
      "difficulty": "normal"
    },
    {
      "id": "food-003",
      "wordA": "Cappuccino",
      "wordB": "Latte",
      "difficulty": "hard"
    }
  ]
}


I recommend beginning with at least:
- 20 categories.
- 30–50 word pairs per category.
- 600–1,000 total word pairs.
- Three difficulty levels.
You can expand the bank later.

Avoid generating arbitrary pairs at runtime with AI. Curated pairs will produce more consistent difficulty and fewer bad rounds.
17. What should happen at the end of a game?
The result screen should display:
Civilians Win!
All spies have been identified.


Secret words
Civilian word

Beach


Spy word

Swimming Pool



Player results
Player	Role	Result
Alex	Civilian	Won
Sam	Civilian	Won
Chris	Spy	Lost
Jamie	Civilian	Won


Total rounds

3

Winning team

Civilians

Play Again (preview)
The real result screen should include:
- Winning team.
- All players and their roles.
- Both secret words.
- Correct and incorrect votes.
- Player scores.
- Total rounds.
- Rematch button.
- Return to lobby button.
A rematch should preserve the room and its members, but generate fresh roles and words.

18. Final recommended ruleset for Yaply
If I were implementing this as Yaply's official version, these would be my defaults:
Feature	Yaply default
Players	3–12
Spy count	Automatic
Secret words	Two related words
Categories	Host-selected
Word difficulty	Normal
Starting player	Random
Clues	One per player
Discussion	45 seconds
Clue round	45 seconds
Voting	30 seconds
Vote visibility	Private
Tie handling	One revote
Elimination	Highest votes
Role reveal	Immediately after elimination
Winning condition	All spies eliminated / spies reach parity
Spy final guess	Enabled
Text chat	Enabled
Voice chat	Enabled
Spectators	Allowed
Rematch	Enabled

19. Development priorities
I would implement this in the following order:
1. Core game engine
   
   Role distribution, secret words, categories, turn order, voting, elimination, revoting and victory conditions.
   Priority 1
2. Multiplayer synchronization
   
   Cloudflare Durable Object integration, server-authoritative state, timers, reconnection and private messages.
   Priority 1
3. Game UI
   
   Lobby, role reveal, player cards, clue phase, discussion, voting and results.
   Priority 2
4. Text chat
   
   Public messages, system messages, spectator separation and moderation.
   Priority 2
5. Voice chat
   
   WebRTC, microphone controls, speaking indicators and connection recovery.
   Priority 3
6. Progression
   
   XP, player statistics, achievements and leaderboards.
   Priority 4

20. Reference material
These are useful references for understanding the original game and its surrounding experience:
1. WePlay on Google Play – Official app listing and description of its party games.
2. WePlay on Apple App Store – Official game description.
3. WePlay Who's the Spy gameplay video – Actual gameplay footage.
4. WePlay Android gameplay – Another gameplay reference.
5. – Community game explanations.
My strongest recommendation: Don't build Who's the Spy as a simple word-and-vote minigame. Build it as a complete social multiplayer experience. The voice conversation, player reactions, secret-word protection, discussion timing, voting and elimination animations are what make this kind of game enjoyable.

The next useful step would be turning this specification into a comprehensive OpenCode implementation prompt for your existing Yaply monorepo, preserving your current Worker, Durable Object and shared protocol architecture.