### Trivia (Quiz) with Firebase

A real-time multiplayer quiz application inspired by Kahoot, built with Next.js and Firebase Realtime Database.

## Features

- **Real-time Multiplayer**: Host games and let players join using a unique game ID
- **Host Controls**: Create custom questions or use predefined question sets
- **Player Experience**: Join games, answer questions, and compete in real-time
- **Scoring System**: Points based on speed and accuracy, with bonus for fastest correct answers
- **Double Points**: Option to set questions with double point value
- **Live Leaderboard**: See rankings update in real-time between questions
- **Responsive Design**: Works on desktop and mobile devices


## Technologies

- Next.js 14 (App Router)
- TypeScript
- Firebase Realtime Database
- Tailwind CSS
- shadcn/ui components
- Framer Motion for animations
- Canvas Confetti for winner celebrations


## Setup

1. Clone the repository:


```shellscript
git clone git@github.com:ivan12/trivia.git
cd trivia
```

2. Install dependencies:


```shellscript
npm install
```

3. Create a `.env.local` file with your Firebase configuration:


```plaintext
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your-database-url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

4. Run the development server:


```shellscript
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.


## How to Use

### As a Host

1. Enter your name and click "Create New Game"
2. Choose predefined questions or create your own
3. Wait for players to join using the displayed Game ID
4. Start the game when ready
5. Control the game flow and view results


### As a Player

1. Enter your name and the Game ID provided by the host
2. Click "Join Game"
3. Wait for the host to start the game
4. Answer questions as quickly as possible
5. View your results and ranking after each question


## Project Structure

```plaintext
app/
├── page.tsx                # Home page with join/create options
├── host/
│   ├── setup/              # Game setup for hosts
│   └── game/               # Host game view
└── player/
    ├── join/               # Player waiting room
    └── game/               # Player game view
lib/
└── firebase.ts            # Firebase configuration
.env.local
```

## Firebase Setup

This project uses Firebase Realtime Database to synchronize game state between players. The database structure is organized as follows:

```plaintext
trivia/
└── [gameId]/
    ├── host                # Host name
    ├── status              # Game status (waiting, starting, in_progress, etc.)
    ├── currentQuestion     # Current question index
    ├── phase               # Game phase (countdown, question, results, etc.)
    ├── timeLeft            # Time remaining for current question
    ├── questions/          # Array of questions
    └── players/            # Player data
        └── [playerId]/
            ├── name        # Player name
            ├── score       # Player score
            └── answer      # Player's current answer
```

## License

MIT

## Acknowledgments

- Inspired by [Kahoot](https://kahoot.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
