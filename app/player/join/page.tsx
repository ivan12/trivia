"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Users, AlertCircle } from "lucide-react"
import { database } from "@/lib/firebase"
import { ref, set, onValue, off } from "firebase/database"

export default function PlayerJoin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameId = searchParams.get("gameId") || ""
  const playerName = searchParams.get("playerName") || ""

  const [gameExists, setGameExists] = useState<boolean | null>(null)
  const [gameStatus, setGameStatus] = useState("")
  const [hostName, setHostName] = useState("")
  const [players, setPlayers] = useState<string[]>([])
  const [playerId, setPlayerId] = useState("")
  const [error, setError] = useState("")

  // Check if game exists and join
  useEffect(() => {
    if (!gameId || !playerName) {
      router.push("/")
      return
    }

    // Generate a unique player ID
    const newPlayerId = Date.now().toString()
    setPlayerId(newPlayerId)

    // Check if game exists
    const gameRef = ref(database, `trivia/${gameId}`)
    onValue(gameRef, (snapshot) => {
      const gameData = snapshot.val()

      if (!gameData) {
        setGameExists(false)
        setError("Game not found. Please check the Game ID.")
        return
      }

      setGameExists(true)
      setHostName(gameData.host || "")
      setGameStatus(gameData.status || "waiting")

      // Get players
      if (gameData.players) {
        setPlayers(Object.keys(gameData.players).map((key) => gameData.players[key].name))
      } else {
        setPlayers([])
      }

      // Add player to the game if not already added
      if (gameData.status === "waiting") {
        const playerRef = ref(database, `trivia/${gameId}/players/${newPlayerId}`)
        set(playerRef, {
          name: playerName,
          score: 0,
          joined: Date.now(),
        })
      }

      // If game is starting or in progress, redirect to game screen
      if (gameData.status === "starting" || gameData.status === "in_progress") {
        router.push(
          `/player/game?gameId=${gameId}&playerId=${newPlayerId}&playerName=${encodeURIComponent(playerName)}`,
        )
      }
    })

    return () => {
      // Clean up listeners
      off(gameRef)
    }
  }, [gameId, playerName, router])

  // Handle leaving the game
  const leaveGame = () => {
    if (playerId) {
      const playerRef = ref(database, `trivia/${gameId}/players/${playerId}`)
      set(playerRef, null)
    }
    router.push("/")
  }

  // Show error if game doesn't exist
  if (gameExists === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="bg-red-500 rounded-t-lg">
            <CardTitle className="text-center text-2xl font-bold text-white">Game Not Found</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <p className="mb-4">{error}</p>
            <Button onClick={() => router.push("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-lg">
          <CardTitle className="text-center text-2xl font-bold text-white">Waiting Room</CardTitle>
          <CardDescription className="text-center text-purple-100">Game ID: {gameId}</CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="text-center mb-6">
            <p className="text-lg font-medium">Welcome, {playerName}!</p>
            <p className="text-gray-500">Waiting for the host to start the game</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Users size={18} />
              Players in Lobby ({players.length})
            </h3>

            <div className="max-h-[200px] overflow-y-auto">
              {players.map((player, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 mb-2 rounded-lg ${
                    player === playerName ? "bg-purple-100 border border-purple-200" : "bg-white border border-gray-100"
                  }`}
                >
                  {player} {player === playerName && "(You)"}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="inline-flex items-center rounded-full bg-yellow-100 px-4 py-2 text-sm text-yellow-800">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
              >
                Waiting for host ({hostName}) to start the game...
              </motion.div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-6 pt-0">
          <Button variant="outline" className="w-full border-red-500 text-red-500 hover:bg-red-50" onClick={leaveGame}>
            Leave Game
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

