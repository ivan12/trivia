'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { LogIn, Plus, Users, Trophy, CheckCircle, XCircle, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

// Quiz questions data
const quizData = [
    {
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctAnswer: 'Paris',
    },
    {
        question: 'Which planet is known as the Red Planet?',
        options: ['Earth', 'Mars', 'Jupiter', 'Venus'],
        correctAnswer: 'Mars',
    },
    {
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
    },
    {
        question: 'Who painted the Mona Lisa?',
        options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Michelangelo'],
        correctAnswer: 'Da Vinci',
    },
    {
        question: "Which element has the chemical symbol 'O'?",
        options: ['Gold', 'Oxygen', 'Osmium', 'Oganesson'],
        correctAnswer: 'Oxygen',
    },
];

// Color options for answer buttons
const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];

// Player interface
interface Player {
    id: string;
    name: string;
    score: number;
    correctAnswers: number;
    answerTimes: number[];
}

// Answer interface
interface Answer {
    playerId: string;
    option: string;
    time: number;
    isCorrect: boolean;
}

export default function KahootQuiz() {
    const router = useRouter();
    const [gameId, setGameId] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [error, setError] = useState('');

    // Generate a random game ID
    const generateGameId = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    // Create a new game as host
    const createGame = () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        const newGameId = generateGameId();
        router.push(`/host/setup?gameId=${newGameId}&hostName=${encodeURIComponent(playerName)}`);
    };

    // Join an existing game as player
    const joinGame = () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!gameId.trim()) {
            setError('Please enter a game ID');
            return;
        }

        router.push(
            `/player/join?gameId=${gameId.toUpperCase()}&playerName=${encodeURIComponent(playerName)}`
        );
    };
    // No início do componente KahootQuiz, adicione um novo estado para controlar o modo de apresentação
    const [presentationMode, setPresentationMode] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [timeLeft, setTimeLeft] = useState(20);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [questionStartTime, setQuestionStartTime] = useState(0);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [fastestCorrectPlayer, setFastestCorrectPlayer] = useState<string | null>(null);

    // Player management
    const [players, setPlayers] = useState<Player[]>([]);

    // Adicione uma função para detectar compartilhamento de tela (opcional)
    useEffect(() => {
        // Tenta detectar se a tela está sendo compartilhada
        if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
            // A API de captura de tela está disponível
            console.log('Screen Capture API is available');
        }
    }, []);

    // Timer effect
    useEffect(() => {
        if (!gameStarted || gameOver || showAnswer || showScoreboard) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameStarted, gameOver, showAnswer, showScoreboard]);

    // Set question start time when a new question begins
    useEffect(() => {
        if (gameStarted && !gameOver && !showAnswer && !showScoreboard) {
            setQuestionStartTime(Date.now());
            setAnswers([]);
            setFastestCorrectPlayer(null);
        }
    }, [currentQuestion, gameStarted, gameOver, showAnswer, showScoreboard]);

    // Handle timeout when timer reaches zero
    const handleTimeout = () => {
        setShowAnswer(true);

        // Find the fastest correct answer
        const correctAnswers = answers.filter(a => a.isCorrect);
        if (correctAnswers.length > 0) {
            // Sort by time (fastest first)
            correctAnswers.sort((a, b) => a.time - b.time);
            setFastestCorrectPlayer(correctAnswers[0].playerId);

            // Award points to players with correct answers
            setPlayers(prevPlayers =>
                prevPlayers.map(player => {
                    const playerAnswer = correctAnswers.find(a => a.playerId === player.id);
                    if (playerAnswer) {
                        // Calculate points based on speed
                        const basePoints = 1000;
                        const speedFactor = Math.max(0, 1 - playerAnswer.time / 20000);
                        const points = Math.round(basePoints * speedFactor);

                        // Add bonus for fastest correct answer
                        const bonusPoints =
                            playerAnswer.playerId === correctAnswers[0].playerId ? 500 : 0;

                        return {
                            ...player,
                            score: player.score + points + bonusPoints,
                            correctAnswers: player.correctAnswers + 1,
                            answerTimes: [...player.answerTimes, playerAnswer.time],
                        };
                    }
                    return player;
                })
            );
        }

        setTimeout(() => {
            nextQuestion();
        }, 3000);
    };

    // Record a player's answer
    const recordAnswer = (playerId: string, option: string) => {
        const answerTime = Date.now() - questionStartTime;
        const isCorrect = option === quizData[currentQuestion].correctAnswer;

        // Check if player already answered
        if (answers.some(a => a.playerId === playerId)) {
            return; // Player already answered this question
        }

        const newAnswer: Answer = {
            playerId,
            option,
            time: answerTime,
            isCorrect,
        };

        setAnswers(prev => [...prev, newAnswer]);

        // If all players have answered, show the answer
        if (answers.length + 1 >= players.length) {
            handleTimeout(); // Use the same logic as timeout
        }
    };

    // Move to the next question or end the game
    const nextQuestion = () => {
        setShowAnswer(false);
        setTimeLeft(20);
        setShowScoreboard(true);

        setTimeout(() => {
            setShowScoreboard(false);

            if (currentQuestion < quizData.length - 1) {
                setCurrentQuestion(prev => prev + 1);
            } else {
                setGameOver(true);
                // Trigger winner animation
                const winner = [...players].sort((a, b) => b.score - a.score)[0];
                if (winner) {
                    triggerWinnerAnimation();
                }
            }
        }, 5000);
    };

    // Add a new player
    const addPlayer = () => {
        if (playerName.trim()) {
            const newPlayer = {
                id: Date.now().toString(),
                name: playerName.trim(),
                score: 0,
                correctAnswers: 0,
                answerTimes: [],
            };

            setPlayers(prev => [...prev, newPlayer]);
            setPlayerName('');
        }
    };

    // Start the game with current players
    const startGame = () => {
        if (players.length > 0) {
            setCurrentQuestion(0);
            setShowAnswer(false);
            setTimeLeft(20);
            setGameOver(false);
            setGameStarted(true);
            setQuestionStartTime(Date.now());
            setAnswers([]);
        }
    };

    // Reset the game completely
    const resetGame = () => {
        setPlayers([]);
        setCurrentQuestion(0);
        setShowAnswer(false);
        setTimeLeft(20);
        setGameOver(false);
        setGameStarted(false);
        setShowScoreboard(false);
        setAnswers([]);
        setFastestCorrectPlayer(null);
    };

    // Trigger winner animation with confetti
    const triggerWinnerAnimation = () => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            // Since particles fall down, start a bit higher than random
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            });
        }, 250);
    };

    // Welcome screen with player registration
    if (!gameStarted) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <Card className="border-0 shadow-xl">
                        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-lg">
                            <CardTitle className="text-center text-3xl font-bold text-white">
                                Trivia Quiz
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="playerName">Your Name</Label>
                                <Input
                                    id="playerName"
                                    value={playerName}
                                    onChange={e => {
                                        setPlayerName(e.target.value);
                                        setError('');
                                    }}
                                    placeholder="Enter your name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gameId">Game ID (to join existing game)</Label>
                                <Input
                                    id="gameId"
                                    value={gameId}
                                    onChange={e => {
                                        setGameId(e.target.value.toUpperCase());
                                        setError('');
                                    }}
                                    placeholder="Enter game ID"
                                    maxLength={6}
                                />
                            </div>

                            {error && <p className="text-red-500 text-sm">{error}</p>}
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-3 p-6 pt-0">
                            <Button
                                onClick={joinGame}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2"
                                disabled={!playerName.trim()}
                            >
                                <LogIn size={18} />
                                Join Game
                            </Button>
                            <div className="relative w-full text-center my-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-white px-2 text-sm text-gray-500">OR</span>
                                </div>
                            </div>
                            <Button
                                onClick={createGame}
                                variant="outline"
                                className="w-full border-purple-600 text-purple-600 hover:bg-purple-50 flex items-center justify-center gap-2"
                                disabled={!playerName.trim()}
                            >
                                <Plus size={18} />
                                Create New Game
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Scoreboard display between questions
    if (showScoreboard && !gameOver) {
        // Get the player who answered correctly the fastest
        const fastestPlayer = fastestCorrectPlayer
            ? players.find(p => p.id === fastestCorrectPlayer)
            : null;

        // Get the time for the fastest player
        const fastestTime =
            fastestPlayer && answers.find(a => a.playerId === fastestPlayer.id)?.time;

        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
                <Card className="w-full max-w-md overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
                        <h2 className="text-center text-2xl font-bold">Scoreboard</h2>
                        <p className="text-center text-purple-100">
                            Question {currentQuestion + 1} completed
                        </p>
                    </div>

                    <CardContent className="p-6">
                        {fastestPlayer && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="mb-6 rounded-lg border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 text-center"
                            >
                                <div className="mb-1 flex items-center justify-center gap-2 text-yellow-700">
                                    <Clock size={18} />
                                    <span className="font-semibold">Fastest Correct Answer</span>
                                </div>
                                <div className="text-2xl font-bold text-yellow-700">
                                    {fastestPlayer.name}
                                </div>
                                {fastestTime && (
                                    <div className="text-sm font-medium text-yellow-600">
                                        {(fastestTime / 1000).toFixed(2)} seconds
                                    </div>
                                )}
                            </motion.div>
                        )}

                        <div className="mb-4 space-y-2">
                            {[...players]
                                .sort((a, b) => b.score - a.score)
                                .map((player, index) => {
                                    const playerAnswer = answers.find(
                                        a => a.playerId === player.id
                                    );

                                    return (
                                        <motion.div
                                            key={player.id}
                                            initial={{ x: -50, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`flex items-center justify-between rounded-lg p-3 ${
                                                index === 0
                                                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300'
                                                    : index === 1
                                                      ? 'bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200'
                                                      : index === 2
                                                        ? 'bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200'
                                                        : 'bg-white border border-gray-100'
                                            } ${player.id === fastestCorrectPlayer ? 'ring-2 ring-yellow-400' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                                        index === 0
                                                            ? 'bg-yellow-400 text-white'
                                                            : index === 1
                                                              ? 'bg-gray-400 text-white'
                                                              : index === 2
                                                                ? 'bg-amber-600 text-white'
                                                                : 'bg-gray-200 text-gray-700'
                                                    } font-bold`}
                                                >
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <span className="font-medium">
                                                        {player.name}
                                                    </span>
                                                    {playerAnswer && (
                                                        <div className="flex items-center text-xs">
                                                            {playerAnswer.isCorrect ? (
                                                                <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                                                            ) : (
                                                                <XCircle className="mr-1 h-3 w-3 text-red-500" />
                                                            )}
                                                            {playerAnswer.isCorrect
                                                                ? 'Correct'
                                                                : 'Incorrect'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-lg">
                                                    {player.score}
                                                </span>
                                                {playerAnswer?.isCorrect && (
                                                    <div className="text-xs text-green-600">
                                                        +
                                                        {Math.round(
                                                            1000 *
                                                                (1 -
                                                                    (playerAnswer.time || 20000) /
                                                                        20000)
                                                        ) +
                                                            (player.id === fastestCorrectPlayer
                                                                ? 500
                                                                : 0)}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                        </div>

                        <div className="mt-6 flex justify-center">
                            <div className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
                                >
                                    Next question coming up...
                                </motion.div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Game over screen with winner animation
    if (gameOver) {
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        const winner = sortedPlayers[0];

        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
                <Card className="w-full max-w-md text-center overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-4 text-white">
                        <h1 className="text-3xl font-bold">Game Over!</h1>
                    </div>

                    <CardContent className="p-6">
                        <div className="mb-8">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 260,
                                    damping: 20,
                                }}
                                className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-lg"
                            >
                                <Trophy className="h-14 w-14 text-white" />
                            </motion.div>

                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mb-2 text-3xl font-bold text-yellow-600"
                            >
                                {winner.name} Wins!
                            </motion.h2>

                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-lg"
                            >
                                Score:{' '}
                                <span className="font-bold text-purple-600">{winner.score}</span>
                            </motion.p>
                        </div>

                        <h3 className="mb-3 text-xl font-semibold flex items-center justify-center">
                            <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                            Final Scoreboard
                        </h3>
                        <div className="mb-6 space-y-2">
                            {sortedPlayers.map((player, index) => (
                                <motion.div
                                    key={player.id}
                                    initial={{ x: -50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.7 + index * 0.1 }}
                                    className={`flex items-center justify-between rounded-lg p-3 ${
                                        index === 0
                                            ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300'
                                            : index === 1
                                              ? 'bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200'
                                              : index === 2
                                                ? 'bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200'
                                                : 'bg-white border border-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                                index === 0
                                                    ? 'bg-yellow-400 text-white'
                                                    : index === 1
                                                      ? 'bg-gray-400 text-white'
                                                      : index === 2
                                                        ? 'bg-amber-600 text-white'
                                                        : 'bg-gray-200 text-gray-700'
                                            } font-bold text-lg`}
                                        >
                                            {index + 1}
                                        </div>
                                        <div>
                                            <span className="font-medium text-lg">
                                                {player.name}
                                            </span>
                                            <div className="text-xs text-gray-500 flex items-center">
                                                <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                                                {player.correctAnswers}/{quizData.length} correct
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-xl">{player.score}</span>
                                        <div className="text-xs text-gray-500">points</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <Button
                            onClick={resetGame}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 py-6 text-xl hover:from-purple-700 hover:to-purple-800"
                        >
                            Play Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Main quiz screen - show options first, then players select their answers
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
            <div className="w-full max-w-4xl">
                {/* Header with timer */}
                <div className="mb-4 flex items-center justify-between rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 p-4 shadow-lg text-white">
                    <div className="flex items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-purple-600 font-bold mr-3">
                            {currentQuestion + 1}
                        </div>
                        <div className="text-xl font-bold">
                            Question {currentQuestion + 1}/{quizData.length}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPresentationMode(!presentationMode)}
                            className="bg-white text-purple-600 hover:bg-purple-100 mr-2"
                        >
                            {presentationMode ? 'Mostrar Jogadores' : 'Modo Apresentação'}
                        </Button>
                        <div className="text-xl font-bold">{timeLeft}s</div>
                        <div className="w-24 h-3 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-1000"
                                style={{ width: `${(timeLeft / 20) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Question card */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="text-2xl font-bold">{quizData[currentQuestion].question}</h2>
                    </CardContent>
                </Card>

                {/* Answer options */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {quizData[currentQuestion].options.map((option, index) => (
                        <motion.div
                            key={index}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative overflow-hidden rounded-lg shadow-lg"
                        >
                            <div
                                className={`h-32 ${colors[index]} p-4 flex items-center justify-center ${
                                    showAnswer && option === quizData[currentQuestion].correctAnswer
                                        ? 'ring-4 ring-green-300'
                                        : ''
                                }`}
                            >
                                <span className="text-2xl font-bold text-white text-center">
                                    {option}
                                    {showAnswer &&
                                        option === quizData[currentQuestion].correctAnswer && (
                                            <CheckCircle className="ml-2 h-6 w-6 inline" />
                                        )}
                                </span>
                            </div>

                            {/* Player selection overlay for each option */}
                            {!showAnswer && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {players.map(player => {
                                            // Check if player already answered
                                            const playerAnswered = answers.some(
                                                a => a.playerId === player.id
                                            );
                                            const playerColor = index % 4; // Assign a color based on player index
                                            const playerColorClasses = [
                                                'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                                                'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
                                                'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
                                                'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
                                            ];

                                            return (
                                                <Button
                                                    key={player.id}
                                                    size="sm"
                                                    className={`h-8 px-3 font-medium text-white rounded-full bg-gradient-to-r shadow-md transform transition-transform ${
                                                        playerColorClasses[
                                                            playerColor % playerColorClasses.length
                                                        ]
                                                    } ${playerAnswered ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                                                    onClick={() =>
                                                        !playerAnswered &&
                                                        recordAnswer(player.id, option)
                                                    }
                                                    disabled={playerAnswered}
                                                >
                                                    {presentationMode
                                                        ? playerAnswered
                                                            ? '✓'
                                                            : '...'
                                                        : player.name}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Players who have answered */}
                <div className="mt-4 rounded-lg bg-white p-4 shadow-lg">
                    <h3 className="mb-2 text-lg font-semibold flex items-center">
                        <Users className="mr-2 h-5 w-5 text-purple-600" />
                        Players Status:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {players.map((player, idx) => {
                            const hasAnswered = answers.some(a => a.playerId === player.id);
                            const playerAnswer = answers.find(a => a.playerId === player.id);
                            const bgColors = [
                                'bg-red-100 text-red-800 border-red-200',
                                'bg-blue-100 text-blue-800 border-blue-200',
                                'bg-yellow-100 text-yellow-800 border-yellow-200',
                                'bg-green-100 text-green-800 border-green-200',
                            ];

                            return (
                                <div
                                    key={player.id}
                                    className={`rounded-full px-4 py-2 text-sm font-medium border ${
                                        hasAnswered
                                            ? playerAnswer?.isCorrect
                                                ? 'bg-green-100 text-green-800 border-green-200'
                                                : 'bg-red-100 text-red-800 border-red-200'
                                            : bgColors[idx % bgColors.length]
                                    } flex items-center`}
                                >
                                    {presentationMode ? `Jogador ${idx + 1}` : player.name}
                                    {hasAnswered &&
                                        (playerAnswer?.isCorrect ? (
                                            <CheckCircle className="ml-1 h-4 w-4" />
                                        ) : (
                                            <XCircle className="ml-1 h-4 w-4" />
                                        ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Answer results - shown when all have answered or time is up */}
                {showAnswer && (
                    <div className="mt-6 rounded-lg bg-white p-4 shadow-lg">
                        <h3 className="mb-4 text-xl font-bold flex items-center">
                            <CheckCircle className="mr-2 h-6 w-6 text-green-600" />
                            Correct Answer:{' '}
                            <span className="ml-2 text-green-600">
                                {quizData[currentQuestion].correctAnswer}
                            </span>
                        </h3>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-700 mb-2">
                                Correct Answers (Fastest First):
                            </h4>
                            {answers
                                .filter(a => a.isCorrect)
                                .sort((a, b) => a.time - b.time)
                                .map((answer, index) => {
                                    const player = players.find(p => p.id === answer.playerId);
                                    if (!player) return null;

                                    // Calculate points based on speed
                                    const basePoints = 1000;
                                    const speedFactor = Math.max(0, 1 - answer.time / 20000);
                                    const points = Math.round(basePoints * speedFactor);
                                    const bonusPoints = index === 0 ? 500 : 0;
                                    const totalPoints = points + bonusPoints;

                                    return (
                                        <motion.div
                                            key={player.id}
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`flex items-center justify-between rounded-lg p-3 ${
                                                index === 0
                                                    ? 'bg-gradient-to-r from-yellow-50 to-green-50 border border-yellow-200'
                                                    : 'bg-green-50 border border-green-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                                        index === 0
                                                            ? 'bg-yellow-400 text-white'
                                                            : 'bg-green-500 text-white'
                                                    } font-bold`}
                                                >
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <span className="font-medium">
                                                        {player.name}
                                                    </span>
                                                    <div className="text-xs text-gray-500">
                                                        {(answer.time / 1000).toFixed(2)}s
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-700">
                                                    +{totalPoints}
                                                </div>
                                                {index === 0 && (
                                                    <div className="text-xs text-yellow-600 font-medium">
                                                        Fastest! +500 bonus
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}

                            {answers.filter(a => a.isCorrect).length === 0 && (
                                <div className="text-center py-3 bg-gray-50 rounded-lg text-gray-500 italic">
                                    No correct answers for this question
                                </div>
                            )}

                            <h4 className="font-semibold text-gray-700 mt-4 mb-2">
                                Incorrect Answers:
                            </h4>
                            <div className="space-y-2">
                                {answers
                                    .filter(a => !a.isCorrect)
                                    .map(answer => {
                                        const player = players.find(p => p.id === answer.playerId);
                                        if (!player) return null;

                                        return (
                                            <motion.div
                                                key={player.id}
                                                initial={{ x: -20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 p-3"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="h-5 w-5 text-red-500" />
                                                    <span className="font-medium">
                                                        {player.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="text-sm text-gray-500 mr-2">
                                                        Answered:{' '}
                                                        {quizData[currentQuestion].options.find(
                                                            opt => opt === answer.option
                                                        )}
                                                    </span>
                                                    <span className="font-bold text-red-600">
                                                        +0
                                                    </span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                {answers.filter(a => !a.isCorrect).length === 0 && (
                                    <div className="text-center py-3 bg-gray-50 rounded-lg text-gray-500 italic">
                                        No incorrect answers
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
