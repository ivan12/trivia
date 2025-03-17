"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { motion } from "framer-motion"
import { Users, Trash2, Edit, Save, ArrowRight, Copy, Check } from "lucide-react"
import { database } from "@/lib/firebase"
import { ref, set, onValue, off } from "firebase/database"

// Predefined question sets
const predefinedQuestions = [
  {
    name: "General Knowledge",
    questions: [
      {
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: 2, // Paris (index 2)
        points: 1,
      },
      {
        question: "Which planet is known as the Red Planet?",
        options: ["Earth", "Mars", "Jupiter", "Venus"],
        correctAnswer: 1, // Mars (index 1)
        points: 1,
      },
      {
        question: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctAnswer: 1, // 4 (index 1)
        points: 1,
      },
      {
        question: "Who painted the Mona Lisa?",
        options: ["Van Gogh", "Picasso", "Da Vinci", "Michelangelo"],
        correctAnswer: 2, // Da Vinci (index 2)
        points: 1,
      },
      {
        question: "Which element has the chemical symbol 'O'?",
        options: ["Gold", "Oxygen", "Osmium", "Oganesson"],
        correctAnswer: 1, // Oxygen (index 1)
        points: 1,
      },
    ],
  },
  {
    name: "Science & Technology",
    questions: [
      {
        question: "What is the chemical symbol for gold?",
        options: ["Au", "Ag", "Fe", "Gd"],
        correctAnswer: 0, // Au (index 0)
        points: 1,
      },
      {
        question: "Which of these is NOT a programming language?",
        options: ["Java", "Python", "Cobra", "Crocodile"],
        correctAnswer: 3, // Crocodile (index 3)
        points: 1,
      },
      {
        question: "What does CPU stand for?",
        options: [
          "Central Processing Unit",
          "Computer Personal Unit",
          "Central Processor Utility",
          "Central Program Unit",
        ],
        correctAnswer: 0, // Central Processing Unit (index 0)
        points: 1,
      },
    ],
  },
]

// Question interface
interface Question {
  question: string
  options: string[]
  correctAnswer: number
  points: number
}

export default function HostSetup() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameId = searchParams.get("gameId") || ""
  const hostName = searchParams.get("hostName") || ""

  const [selectedQuestionSet, setSelectedQuestionSet] = useState(0)
  const [customQuestions, setCustomQuestions] = useState<Question[]>([])
  const [currentTab, setCurrentTab] = useState("predefined")
  const [players, setPlayers] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  // New question form
  const [newQuestion, setNewQuestion] = useState("")
  const [newOptions, setNewOptions] = useState(["", "", "", ""])
  const [newCorrectAnswer, setNewCorrectAnswer] = useState(0)
  const [newPoints, setNewPoints] = useState(1)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Initialize game in Firebase
  useEffect(() => {
    if (!gameId) return

    // Create game in Firebase
    const gameRef = ref(database, `trivia/${gameId}`)
    set(gameRef, {
      host: hostName,
      status: "waiting",
      players: {},
      questions: [],
      currentQuestion: -1,
    })

    // Listen for player joins
    const playersRef = ref(database, `trivia/${gameId}/players`)
    onValue(playersRef, (snapshot) => {
      const playersData = snapshot.val()
      if (playersData) {
        setPlayers(Object.keys(playersData).map((key) => playersData[key].name))
      } else {
        setPlayers([])
      }
    })

    return () => {
      // Clean up listeners
      off(playersRef)
    }
  }, [gameId, hostName])

  // Handle option change for new question
  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...newOptions]
    updatedOptions[index] = value
    setNewOptions(updatedOptions)
  }

  // Add or update a question
  const handleSaveQuestion = () => {
    if (!newQuestion.trim() || newOptions.some((opt) => !opt.trim())) {
      return // Don't save if question or any option is empty
    }

    const questionData = {
      question: newQuestion,
      options: newOptions,
      correctAnswer: newCorrectAnswer,
      points: newPoints,
    }

    if (editingIndex !== null) {
      // Update existing question
      const updatedQuestions = [...customQuestions]
      updatedQuestions[editingIndex] = questionData
      setCustomQuestions(updatedQuestions)
    } else {
      // Add new question
      setCustomQuestions([...customQuestions, questionData])
    }

    // Reset form
    setNewQuestion("")
    setNewOptions(["", "", "", ""])
    setNewCorrectAnswer(0)
    setNewPoints(1)
    setEditingIndex(null)
  }

  // Edit a question
  const handleEditQuestion = (index: number) => {
    const question = customQuestions[index]
    setNewQuestion(question.question)
    setNewOptions([...question.options])
    setNewCorrectAnswer(question.correctAnswer)
    setNewPoints(question.points)
    setEditingIndex(index)
  }

  // Delete a question
  const handleDeleteQuestion = (index: number) => {
    const updatedQuestions = customQuestions.filter((_, i) => i !== index)
    setCustomQuestions(updatedQuestions)
  }

  // Copy game ID to clipboard
  const copyGameId = () => {
    navigator.clipboard.writeText(gameId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Start the game
  const startGame = () => {
    // Determine which questions to use
    const questions = currentTab === "predefined" ? predefinedQuestions[selectedQuestionSet].questions : customQuestions

    if (questions.length === 0) {
      return // Don't start if no questions
    }

    // Update game in Firebase
    const gameRef = ref(database, `trivia/${gameId}`)
    set(ref(database, `trivia/${gameId}/questions`), questions)
    set(ref(database, `trivia/${gameId}/status`), "starting")

    // Navigate to game screen
    router.push(`/host/game?gameId=${gameId}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-indigo-900 p-4">
      <div className="w-full max-w-4xl">
        <Card className="border-0 shadow-xl mb-4">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-lg">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold text-white">Game Setup</CardTitle>
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                <span className="text-white font-medium">Game ID: {gameId}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
                  onClick={copyGameId}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
            <CardDescription className="text-purple-100">Host: {hostName}</CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left column - Players */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users size={18} />
                  Players ({players.length})
                </h3>

                <div className="bg-gray-50 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
                  {players.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>Waiting for players to join...</p>
                      <p className="text-sm mt-2">Share the Game ID with players</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {players.map((player, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
                        >
                          {player}
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right column - Questions */}
              <div className="md:col-span-2">
                <Tabs value={currentTab} onValueChange={setCurrentTab}>
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="predefined" className="flex-1">
                      Predefined Questions
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="flex-1">
                      Create Your Own
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="predefined" className="space-y-4">
                    <div className="space-y-4">
                      <Label>Select a Question Set</Label>
                      <RadioGroup
                        value={selectedQuestionSet.toString()}
                        onValueChange={(value) => setSelectedQuestionSet(Number.parseInt(value))}
                        className="space-y-2"
                      >
                        {predefinedQuestions.map((set, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem value={index.toString()} id={`set-${index}`} />
                            <Label htmlFor={`set-${index}`} className="font-normal">
                              {set.name} ({set.questions.length} questions)
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Preview:</h4>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                        {predefinedQuestions[selectedQuestionSet].questions.map((q, index) => (
                          <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-0">
                            <p className="font-medium">
                              {index + 1}. {q.question}
                            </p>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {q.options.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className={`p-2 rounded-md text-sm ${
                                    optIndex === q.correctAnswer
                                      ? "bg-green-100 border border-green-200"
                                      : "bg-gray-100"
                                  }`}
                                >
                                  {option} {optIndex === q.correctAnswer && "✓"}
                                </div>
                              ))}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              Points: {q.points === 2 ? "Double (2x)" : "Standard (1x)"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="custom" className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium mb-3">
                        {editingIndex !== null ? "Edit Question" : "Add New Question"}
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="question">Question</Label>
                          <Input
                            id="question"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            placeholder="Enter your question"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {newOptions.map((option, index) => (
                            <div key={index}>
                              <Label htmlFor={`option-${index}`} className="flex items-center gap-2">
                                <div
                                  className={`w-4 h-4 rounded-full ${
                                    newCorrectAnswer === index ? "bg-green-500" : "bg-gray-300"
                                  }`}
                                ></div>
                                Option {index + 1}
                              </Label>
                              <div className="flex mt-1">
                                <Input
                                  id={`option-${index}`}
                                  value={option}
                                  onChange={(e) => handleOptionChange(index, e.target.value)}
                                  placeholder={`Option ${index + 1}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-1"
                                  onClick={() => setNewCorrectAnswer(index)}
                                >
                                  {newCorrectAnswer === index ? "Correct ✓" : "Set as correct"}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Label htmlFor="points">Double Points</Label>
                          <Switch
                            id="points"
                            checked={newPoints === 2}
                            onCheckedChange={(checked) => setNewPoints(checked ? 2 : 1)}
                          />
                          <span className="text-sm text-gray-500">
                            {newPoints === 2 ? "Double points (2x)" : "Standard points (1x)"}
                          </span>
                        </div>

                        <div className="flex justify-end">
                          {editingIndex !== null && (
                            <Button
                              type="button"
                              variant="outline"
                              className="mr-2"
                              onClick={() => {
                                setNewQuestion("")
                                setNewOptions(["", "", "", ""])
                                setNewCorrectAnswer(0)
                                setNewPoints(1)
                                setEditingIndex(null)
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            type="button"
                            onClick={handleSaveQuestion}
                            disabled={!newQuestion.trim() || newOptions.some((opt) => !opt.trim())}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {editingIndex !== null ? "Update Question" : "Add Question"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="font-medium mb-2 flex items-center">Your Questions ({customQuestions.length})</h4>

                      {customQuestions.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                          <p>No custom questions yet</p>
                          <p className="text-sm mt-1">Add questions using the form above</p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                          {customQuestions.map((q, index) => (
                            <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-0">
                              <div className="flex justify-between items-start">
                                <p className="font-medium">
                                  {index + 1}. {q.question}
                                </p>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500"
                                    onClick={() => handleEditQuestion(index)}
                                  >
                                    <Edit size={16} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500"
                                    onClick={() => handleDeleteQuestion(index)}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {q.options.map((option, optIndex) => (
                                  <div
                                    key={optIndex}
                                    className={`p-2 rounded-md text-sm ${
                                      optIndex === q.correctAnswer
                                        ? "bg-green-100 border border-green-200"
                                        : "bg-gray-100"
                                    }`}
                                  >
                                    {option} {optIndex === q.correctAnswer && "✓"}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                Points: {q.points === 2 ? "Double (2x)" : "Standard (1x)"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between p-6 pt-0">
            <Button variant="outline" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button
              onClick={startGame}
              disabled={(currentTab === "custom" && customQuestions.length === 0) || players.length === 0}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              Start Game
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

