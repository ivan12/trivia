"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { motion } from "framer-motion"
import { CheckCircle, XCircle, Trophy, Clock } from "lucide-react"
import { database } from "@/lib/firebase"
import { ref, onValue, off, update } from "firebase/database"

// Color options for answer buttons
const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"]

// Question interface
interface Question {
  question: string
  options: string[]
  correctAnswer: number
  points: number
}

// Player interface
interface Player {
  id: string
  name: string
  score: number
}

export default function PlayerGame() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameId = searchParams.get("gameId") || ""
  const playerId = searchParams.get("playerId") || ""
  const playerName = searchParams.get("playerName") || ""

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [timeLeft, setTimeLeft] = useState(20)
  const [gamePhase, setGamePhase] = useState<"countdown" | "question" | "results" | "leaderboard" | "finished">(
    "countdown",
  )
  const [countdownValue, setCountdownValue] = useState(3)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answerResult, setAnswerResult] = useState<"correct" | "incorrect" | null>(null)
  const [score, setScore] = useState(0)
  const [players, setPlayers] = useState<Player[]>([])
  const [answerTime, setAnswerTime] = useState<number | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState(0)

  // Initialize game data from Firebase
  useEffect(() => {
    if (!gameId || !playerId) {
      router.push("/")
      return
    }

    const gameRef = ref(database, `trivia/${gameId}`)
    onValue(gameRef, (snapshot) => {
      const gameData = snapshot.val()

      if (!gameData) {
        router.push("/")
        return
      }

      // Load questions
      if (gameData.questions) {
        setQuestions(gameData.questions)
      }

      // Set current question
      if (gameData.currentQuestion !== undefined) {
        setCurrentQuestionIndex(gameData.currentQuestion)
        if (gameData.currentQuestion >= 0 && gameData.questions) {
          setCurrentQuestion(gameData.questions[gameData.currentQuestion])
        }
      }

      // Set game phase
      if (gameData.phase) {
        setGamePhase(gameData.phase)

        // Reset selection when phase changes to question
        if (gameData.phase === "question" && gamePhase !== "question") {
          setSelectedOption(null)
          setAnswerResult(null)
          setAnswerTime(null)
          setQuestionStartTime(Date.now())
        }
      }

      // Set time left
      if (gameData.timeLeft !== undefined) {
        setTimeLeft(gameData.timeLeft)
      }

      // Get player score
      if (gameData.players && gameData.players[playerId]) {
        setScore(gameData.players[playerId].score || 0)
      }

      // Get all players for leaderboard
      if (gameData.players) {
        const playersList: Player[] = []
        Object.keys(gameData.players).forEach((pid) => {
          playersList.push({
            id: pid,
            name: gameData.players[pid].name,
            score: gameData.players[pid].score || 0,
          })
        })
        setPlayers(playersList)
      }
    })

    return () => {
      // Clean up listeners
      off(gameRef)
    }
  }, [gameId, playerId, router, gamePhase])

  // Handle selecting an answer
  const selectAnswer = (optionIndex: number) => {
    if (selectedOption !== null || gamePhase !== "question") return

    const time = Date.now() - questionStartTime
    setSelectedOption(optionIndex)
    setAnswerTime(time)

    // Check if answer is correct
    const isCorrect = optionIndex === currentQuestion?.correctAnswer
    setAnswerResult(isCorrect ? "correct" : "incorrect")

    // Update answer in Firebase
    update(ref(database, `trivia/${gameId}/players/${playerId}`), {
      answer: {
        questionIndex: currentQuestionIndex,
        option: optionIndex,
        time: time,
        isCorrect: isCorrect,
      },
    })
  }

  // Render countdown screen
  if (gamePhase === "countdown") {
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
          {countdownValue === 0 ? "GO!" : countdownValue}
        </motion.div>
      </div>
    )
  }

  // Render results screen
  if (gamePhase === "results" && currentQuestion) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
        <Card className="w-full max-w-md overflow-hidden">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">{currentQuestion.question}</h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg flex items-center justify-center ${colors[index]} ${
                    index === currentQuestion.correctAnswer
                      ? "ring-4 ring-green-300"
                      : index === selectedOption
                        ? "ring-4 ring-red-300"
                        : ""
                  }`}
                >
                  <span className="text-lg font-bold text-white">
                    {option}
                    {index === currentQuestion.correctAnswer && <CheckCircle className="ml-2 h-5 w-5 inline" />}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-center">
              {answerResult === "correct" ? (
                <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <h3 className="text-xl font-bold text-green-700">Correct!</h3>
                  {answerTime !== null && (
                    <p className="text-green-600">You answered in {(answerTime / 1000).toFixed(2)} seconds</p>
                  )}
                </div>
              ) : answerResult === "incorrect" ? (
                <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-4">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                  <h3 className="text-xl font-bold text-red-700">Incorrect!</h3>
                  <p className="text-red-600">
                    The correct answer was: {currentQuestion.options[currentQuestion.correctAnswer]}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-4">
                  <Clock className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                  <h3 className="text-xl font-bold text-gray-700">Time's Up!</h3>
                  <p className="text-gray-600">
                    The correct answer was: {currentQuestion.options[currentQuestion.correctAnswer]}
                  </p>
                </div>
              )}

              <div className="mt-4">
                <p className="text-lg">
                  Your Score: <span className="font-bold">{score}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render leaderboard screen
  if (gamePhase === "leaderboard") {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
    const playerRank = sortedPlayers.findIndex((p) => p.id === playerId) + 1

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
            <div className="mb-4">
              <div className="bg-purple-100 border border-purple-200 rounded-lg p-3 mb-4 text-center">
                <p className="text-purple-800">
                  Your Rank: <span className="font-bold">{playerRank}</span> of {players.length}
                </p>
                <p className="text-purple-700 font-bold text-xl">Score: {score}</p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {sortedPlayers.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between rounded-lg p-3 ${
                      player.id === playerId
                        ? "bg-purple-100 border border-purple-200"
                        : index === 0
                          ? "bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-300"
                          : index === 1
                            ? "bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200"
                            : index === 2
                              ? "bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200"
                              : "bg-white border border-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          index === 0
                            ? "bg-yellow-400 text-white"
                            : index === 1
                              ? "bg-gray-400 text-white"
                              : index === 2
                                ? "bg-amber-600 text-white"
                                : "bg-gray-200 text-gray-700"
                        } font-bold`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <span className="font-medium">
                          {player.name} {player.id === playerId && "(You)"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg">{player.score}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="inline-flex items-center rounded-full bg-yellow-100 px-4 py-2 text-sm text-yellow-800">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
                >
                  Next question coming up...
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render game finished screen
  if (gamePhase === "finished") {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
    const winner = sortedPlayers.length > 0 ? sortedPlayers[0] : null
    const playerRank = sortedPlayers.findIndex((p) => p.id === playerId) + 1
    const isWinner = winner?.id === playerId

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
                    type: "spring",
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
                  {isWinner && " (You)"}
                </motion.h2>

                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg"
                >
                  Score: <span className="font-bold text-purple-600">{winner.score}</span>
                </motion.p>
              </div>
            )}

            <div className="bg-purple-100 border border-purple-200 rounded-lg p-3 mb-4">
              <h3 className="font-semibold text-purple-800">Your Results</h3>
              <p className="text-purple-700 font-bold text-xl">
                Rank: {playerRank} of {players.length}
              </p>
              <p className="text-purple-700 font-bold text-xl">Score: {score}</p>
            </div>

            <h3 className="mb-3 text-xl font-semibold flex items-center justify-center">
              <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
              Final Scoreboard
            </h3>
            <div className="mb-6 space-y-2 max-h-[300px] overflow-y-auto">
              {sortedPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className={`flex items-center justify-between rounded-lg p-3 ${
                    player.id === playerId
                      ? "bg-purple-100 border border-purple-200"
                      : index === 0
                        ? "bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300"
                        : index === 1
                          ? "bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200"
                          : index === 2
                            ? "bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-200"
                            : "bg-white border border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        index === 0
                          ? "bg-yellow-400 text-white"
                          : index === 1
                            ? "bg-gray-400 text-white"
                            : index === 2
                              ? "bg-amber-600 text-white"
                              : "bg-gray-200 text-gray-700"
                      } font-bold text-lg`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <span className="font-medium text-lg">
                        {player.name} {player.id === playerId && "(You)"}
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
              onClick={() => router.push("/")}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 py-6 text-xl hover:from-purple-700 hover:to-purple-800"
            >
              Play Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render question screen
  if (gamePhase === "question" && currentQuestion) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
        <div className="w-full max-w-md">
          {/* Header with timer */}
          <div className="mb-4 flex items-center justify-between rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 p-4 shadow-lg text-white">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-purple-600 font-bold mr-3">
                {currentQuestionIndex + 1}
              </div>
              <div className="text-lg font-bold">
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
              <h2 className="text-xl font-bold">{currentQuestion.question}</h2>
              {currentQuestion.points === 2 && (
                <div className="mt-2 inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800">
                  Double Points Question!
                </div>
              )}
            </CardContent>
          </Card>

          {/* Answer options */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {currentQuestion.options.map((option, index) => (
              <motion.button
                key={index}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`h-32 ${colors[index]} p-4 flex items-center justify-center rounded-lg shadow-lg ${
                  selectedOption === index ? "ring-4 ring-white" : ""
                } ${selectedOption !== null ? "opacity-70" : "hover:opacity-90"}`}
                onClick={() => selectAnswer(index)}
                disabled={selectedOption !== null}
              >
                <span className="text-2xl font-bold text-white text-center">{option}</span>
              </motion.button>
            ))}
          </div>

          {/* Score display */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-purple-800">
              Your Score: {score}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default loading screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
      <div className="text-white text-2xl">Loading game...</div>
    </div>
  )
}

