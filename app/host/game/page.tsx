'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Trophy, Users, Clock, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { database } from '@/lib/firebase';
import { ref, set, onValue, off, update } from 'firebase/database';

// Color options for answer buttons
const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];

// Player interface
interface Player {
    id: string;
    name: string;
    score: number;
    answer?: {
        questionIndex: number;
        option: number;
        time: number;
        isCorrect: boolean;
    } | null;
}

// Question interface
interface Question {
    question: string;
    options: string[];
    correctAnswer: number;
    points: number;
}

export default function HostGame() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const gameId = searchParams.get('gameId') || '';

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [players, setPlayers] = useState<Player[]>([]);
    const [timeLeft, setTimeLeft] = useState(20);
    const [gamePhase, setGamePhase] = useState<
        'countdown' | 'question' | 'results' | 'leaderboard' | 'finished'
    >('countdown');
    const [countdownValue, setCountdownValue] = useState(3);
    const [fastestCorrectPlayer, setFastestCorrectPlayer] = useState<string | null>(null);

    // Initialize game data from Firebase
    useEffect(() => {
        if (!gameId) {
            router.push('/');
            return;
        }

        const gameRef = ref(database, `trivia/${gameId}`);
        onValue(gameRef, snapshot => {
            const gameData = snapshot.val();

            if (!gameData) {
                router.push('/');
                return;
            }

            // Load questions
            if (gameData.questions) {
                setQuestions(gameData.questions);
            }

            // Load players
            if (gameData.players) {
                const playersList: Player[] = [];
                Object.keys(gameData.players).forEach(playerId => {
                    playersList.push({
                        id: playerId,
                        name: gameData.players[playerId].name,
                        score: gameData.players[playerId].score || 0,
                        answer: gameData.players[playerId].answer || null,
                    });
                });
                setPlayers(playersList);
            }

            // Set current question
            if (gameData.currentQuestion !== undefined) {
                setCurrentQuestionIndex(gameData.currentQuestion);
            }

            // Set game phase
            if (gameData.phase) {
                setGamePhase(gameData.phase);
            }

            // Set time left
            if (gameData.timeLeft !== undefined) {
                setTimeLeft(gameData.timeLeft);
            }
        });

        return () => {
            // Clean up listeners
            off(gameRef);
        };
    }, [gameId, router]);

    // Handle countdown timer
    useEffect(() => {
        if (gamePhase !== 'countdown') return;

        if (countdownValue > 0) {
            const timer = setTimeout(() => {
                setCountdownValue(countdownValue - 1);
            }, 1000);

            return () => clearTimeout(timer);
        } else {
            // Start the first question
            startQuestion(0);
        }
    }, [countdownValue, gamePhase]);

    // Handle question timer
    useEffect(() => {
        if (gamePhase !== 'question') return;

        if (timeLeft > 0) {
            const timer = setTimeout(() => {
                const newTimeLeft = timeLeft - 1;
                setTimeLeft(newTimeLeft);

                // Update time in Firebase
                update(ref(database, `trivia/${gameId}`), {
                    timeLeft: newTimeLeft,
                });

                if (newTimeLeft === 0) {
                    showResults();
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [timeLeft, gamePhase, gameId]);

    // Check if all players have answered
    useEffect(() => {
        if (gamePhase !== 'question' || currentQuestionIndex === -1) return;

        const allAnswered = players.every(
            player => player.answer && player.answer.questionIndex === currentQuestionIndex
        );

        if (allAnswered && players.length > 0) {
            showResults();
        }
    }, [players, gamePhase, currentQuestionIndex]);

    // Start a question
    const startQuestion = (index: number) => {
        if (index >= questions.length) {
            finishGame();
            return;
        }

        // Reset player answers
        const updatedPlayers: Record<string, any> = {};
        players.forEach(player => {
            updatedPlayers[player.id] = {
                ...player,
                answer: null,
            };
        });

        // Update game state in Firebase
        update(ref(database, `trivia/${gameId}`), {
            currentQuestion: index,
            phase: 'question',
            timeLeft: 20,
            players: updatedPlayers,
        });

        setCurrentQuestionIndex(index);
        setTimeLeft(20);
        setGamePhase('question');
        setFastestCorrectPlayer(null);
    };

    // Show results for current question
    const showResults = () => {
        // Find fastest correct player
        const correctAnswers = players.filter(
            player =>
                player.answer &&
                player.answer.questionIndex === currentQuestionIndex &&
                player.answer.isCorrect
        );

        if (correctAnswers.length > 0) {
            // Sort by time (fastest first)
            correctAnswers.sort((a, b) => (a.answer?.time || 0) - (b.answer?.time || 0));
            setFastestCorrectPlayer(correctAnswers[0].id);
        }

        // Calculate and update scores
        const updatedPlayers: Record<string, any> = {};
        players.forEach(player => {
            const answer = player.answer;
            let newScore = player.score;

            if (answer && answer.questionIndex === currentQuestionIndex && answer.isCorrect) {
                // Calculate points based on speed
                const currentQuestion = questions[currentQuestionIndex];
                const basePoints = 1000 * (currentQuestion.points || 1);
                const speedFactor = Math.max(0, 1 - (answer.time || 0) / 20000);
                const points = Math.round(basePoints * speedFactor);

                // Add bonus for fastest correct answer
                const bonusPoints = player.id === fastestCorrectPlayer ? 500 : 0;

                newScore += points + bonusPoints;
            }

            // IMPORTANTE: Garantir que nunca enviamos undefined para o Firebase
            updatedPlayers[player.id] = {
                ...player,
                score: newScore,
                // Se o jogador não respondeu, definimos answer como null explicitamente
                answer: player.answer || null,
            };
        });

        // Update game state in Firebase
        update(ref(database, `trivia/${gameId}`), {
            phase: 'results',
            players: updatedPlayers,
        });

        setGamePhase('results');
    };

    // Show leaderboard between questions
    const showLeaderboard = () => {
        update(ref(database, `trivia/${gameId}`), {
            phase: 'leaderboard',
        });

        setGamePhase('leaderboard');
    };

    // Move to next question
    const nextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            startQuestion(currentQuestionIndex + 1);
        } else {
            finishGame();
        }
    };

    // Finish the game
    const finishGame = () => {
        update(ref(database, `trivia/${gameId}`), {
            phase: 'finished',
        });

        setGamePhase('finished');

        // Trigger winner animation
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        if (sortedPlayers.length > 0) {
            triggerWinnerAnimation();
        }
    };

    // Return to home
    const returnToHome = () => {
        // Clean up game data
        set(ref(database, `trivia/${gameId}`), null);
        router.push('/');
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

    // Render countdown screen
    if (gamePhase === 'countdown') {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
                <motion.div
                    key={countdownValue}
                    initial={{ scale: 3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-white text-9xl font-bold"
                >
                    {countdownValue === 0 ? 'GO!' : countdownValue}
                </motion.div>
            </div>
        );
    }

    // Render results screen
    if (
        gamePhase === 'results' &&
        currentQuestionIndex >= 0 &&
        currentQuestionIndex < questions.length
    ) {
        const currentQuestion = questions[currentQuestionIndex];

        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
                <div className="w-full max-w-4xl">
                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <h2 className="text-2xl font-bold mb-4">{currentQuestion.question}</h2>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
                                {currentQuestion.options.map((option, index) => (
                                    <div
                                        key={index}
                                        className={`h-24 ${colors[index]} p-4 flex items-center justify-center rounded-lg ${
                                            index === currentQuestion.correctAnswer
                                                ? 'ring-4 ring-green-300'
                                                : ''
                                        }`}
                                    >
                                        <span className="text-2xl font-bold text-white text-center">
                                            {option}
                                            {index === currentQuestion.correctAnswer && (
                                                <CheckCircle className="ml-2 h-6 w-6 inline" />
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="text-xl font-bold flex items-center mb-4">
                                    <CheckCircle className="mr-2 h-6 w-6 text-green-600" />
                                    Correct Answer:{' '}
                                    <span className="ml-2 text-green-600">
                                        {currentQuestion.options[currentQuestion.correctAnswer]}
                                    </span>
                                </h3>

                                <div className="space-y-3">
                                    <h4 className="font-semibold text-gray-700 mb-2">Results:</h4>

                                    {/* Correct answers */}
                                    <div className="space-y-2">
                                        {players
                                            .filter(
                                                player =>
                                                    player.answer &&
                                                    player.answer.questionIndex ===
                                                        currentQuestionIndex &&
                                                    player.answer.isCorrect
                                            )
                                            .sort(
                                                (a, b) =>
                                                    (a.answer?.time || 0) - (b.answer?.time || 0)
                                            )
                                            .map((player, index) => {
                                                const answerTime = player.answer?.time || 0;

                                                // Calculate points
                                                const basePoints =
                                                    1000 * (currentQuestion.points || 1);
                                                const speedFactor = Math.max(
                                                    0,
                                                    1 - answerTime / 20000
                                                );
                                                const points = Math.round(basePoints * speedFactor);
                                                const bonusPoints =
                                                    player.id === fastestCorrectPlayer ? 500 : 0;

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
                                                                    {(answerTime / 1000).toFixed(2)}
                                                                    s
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-green-700">
                                                                +{points + bonusPoints}
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

                                        {players.filter(
                                            player =>
                                                player.answer &&
                                                player.answer.questionIndex ===
                                                    currentQuestionIndex &&
                                                player.answer.isCorrect
                                        ).length === 0 && (
                                            <div className="text-center py-3 bg-gray-50 rounded-lg text-gray-500 italic">
                                                No correct answers for this question
                                            </div>
                                        )}
                                    </div>

                                    {/* Incorrect answers */}
                                    <h4 className="font-semibold text-gray-700 mt-4 mb-2">
                                        Incorrect Answers:
                                    </h4>
                                    <div className="space-y-2">
                                        {players
                                            .filter(
                                                player =>
                                                    player.answer &&
                                                    player.answer.questionIndex ===
                                                        currentQuestionIndex &&
                                                    !player.answer.isCorrect
                                            )
                                            .map(player => {
                                                const answerOption =
                                                    player.answer?.option !== undefined
                                                        ? currentQuestion.options[
                                                              player.answer.option
                                                          ]
                                                        : 'No answer';

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
                                                                Answered: {answerOption}
                                                            </span>
                                                            <span className="font-bold text-red-600">
                                                                +0
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}

                                        {players.filter(
                                            player =>
                                                player.answer &&
                                                player.answer.questionIndex ===
                                                    currentQuestionIndex &&
                                                !player.answer.isCorrect
                                        ).length === 0 && (
                                            <div className="text-center py-3 bg-gray-50 rounded-lg text-gray-500 italic">
                                                No incorrect answers
                                            </div>
                                        )}
                                    </div>

                                    {/* No answers */}
                                    {players.filter(
                                        player =>
                                            !player.answer ||
                                            player.answer.questionIndex !== currentQuestionIndex
                                    ).length > 0 && (
                                        <>
                                            <h4 className="font-semibold text-gray-700 mt-4 mb-2">
                                                No Answer:
                                            </h4>
                                            <div className="space-y-2">
                                                {players
                                                    .filter(
                                                        player =>
                                                            !player.answer ||
                                                            player.answer.questionIndex !==
                                                                currentQuestionIndex
                                                    )
                                                    .map(player => (
                                                        <motion.div
                                                            key={player.id}
                                                            initial={{ x: -20, opacity: 0 }}
                                                            animate={{ x: 0, opacity: 1 }}
                                                            className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 p-3"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="h-5 w-5 text-gray-500" />
                                                                <span className="font-medium">
                                                                    {player.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <span className="text-sm text-gray-500 mr-2">
                                                                    Time ran out
                                                                </span>
                                                                <span className="font-bold text-gray-600">
                                                                    +0
                                                                </span>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-between items-center">
                        <div className="text-white">
                            <span className="font-medium">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </span>
                        </div>
                        <Button
                            onClick={showLeaderboard}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        >
                            Show Leaderboard
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Render leaderboard screen
    if (gamePhase === 'leaderboard') {
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
                <Card className="w-full max-w-md overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
                        <h2 className="text-center text-2xl font-bold">Leaderboard</h2>
                        <p className="text-center text-purple-100">
                            {currentQuestionIndex + 1} of {questions.length} questions completed
                        </p>
                    </div>

                    <CardContent className="p-6">
                        <div className="mb-4 space-y-2">
                            {sortedPlayers.map((player, index) => (
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
                                    }`}
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
                                            <span className="font-medium">{player.name}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-lg">{player.score}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-center">
                            {currentQuestionIndex < questions.length - 1 ? (
                                <Button
                                    onClick={nextQuestion}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                >
                                    Next Question
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={finishGame}
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                >
                                    Finish Game
                                    <Trophy className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render game finished screen
    if (gamePhase === 'finished') {
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        const winner = sortedPlayers.length > 0 ? sortedPlayers[0] : null;

        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
                <Card className="w-full max-w-md text-center overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-4 text-white">
                        <h1 className="text-3xl font-bold">Game Over!</h1>
                    </div>

                    <CardContent className="p-6">
                        {winner && (
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
                                    <span className="font-bold text-purple-600">
                                        {winner.score}
                                    </span>
                                </motion.p>
                            </div>
                        )}

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
                            onClick={returnToHome}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 py-6 text-xl hover:from-purple-700 hover:to-purple-800"
                        >
                            New Game
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render question screen
    if (
        gamePhase === 'question' &&
        currentQuestionIndex >= 0 &&
        currentQuestionIndex < questions.length
    ) {
        const currentQuestion = questions[currentQuestionIndex];

        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
                <div className="w-full max-w-4xl">
                    {/* Header with timer */}
                    <div className="mb-4 flex items-center justify-between rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 p-4 shadow-lg text-white">
                        <div className="flex items-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-purple-600 font-bold mr-3">
                                {currentQuestionIndex + 1}
                            </div>
                            <div className="text-xl font-bold">
                                Question {currentQuestionIndex + 1}/{questions.length}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-xl font-bold">{timeLeft}s</div>
                            <Progress value={(timeLeft / 20) * 100} className="w-24 h-3" />
                        </div>
                    </div>

                    {/* Question card */}
                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <h2 className="text-2xl font-bold">{currentQuestion.question}</h2>
                            {currentQuestion.points === 2 && (
                                <div className="mt-2 inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800">
                                    Double Points Question!
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Answer options */}
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {currentQuestion.options.map((option, index) => (
                            <motion.div
                                key={index}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative overflow-hidden rounded-lg shadow-lg"
                            >
                                <div
                                    className={`h-32 ${colors[index]} p-4 flex items-center justify-center`}
                                >
                                    <span className="text-2xl font-bold text-white text-center">
                                        {option}
                                    </span>
                                </div>
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
                                const hasAnswered =
                                    player.answer &&
                                    player.answer.questionIndex === currentQuestionIndex;
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
                                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                                : bgColors[idx % bgColors.length]
                                        } flex items-center`}
                                    >
                                        {player.name}
                                        {hasAnswered && <CheckCircle className="ml-1 h-4 w-4" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default loading screen
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
            <div className="text-white text-2xl">Loading game...</div>
        </div>
    );
}
