// src/components/TestModal/TestModal.tsx

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { Test, TestQuestion } from '../../types';
import { testAPI } from '../../services/api';

interface TestModalProps {
  test: Test;
  onClose: () => void;
}

type TestStage = 'intro' | 'questions' | 'complete';

const TestModal: React.FC<TestModalProps> = ({ test, onClose }) => {
  const [stage, setStage] = useState<TestStage>('intro');
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctOption, setCorrectOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (stage === 'questions' && questions.length === 0) {
      loadQuestions();
    }
  }, [stage]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await testAPI.getTestQuestions(test.test_name);
      setQuestions(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
      alert('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = () => {
    setStage('questions');
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null) {
      alert('Please select an option');
      return;
    }

    try {
      setLoading(true);
      const result = await testAPI.submitAnswer(
        questions[currentQuestionIndex].id,
        selectedOption
      );
      
      setIsCorrect(result.is_correct);
      setCorrectOption(result.correct_option);
      setShowResult(true);
      
      if (result.is_correct) {
        setScore(score + 1);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
      setIsCorrect(false);
      setCorrectOption(null);
    } else {
      setStage('complete');
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{test.test_name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Intro Stage */}
          {stage === 'intro' && (
            <div className="text-center space-y-6">
              <div className="inline-block p-4 bg-indigo-100 rounded-full">
                <svg className="w-16 h-16 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Test Information</h3>
                <div className="space-y-2 text-gray-600">
                  <p><strong>Source File:</strong> {test.source_file_name}</p>
                  <p><strong>Pages:</strong> {test.source_pages}</p>
                  <p><strong>Number of Questions:</strong> {test.num_questions}</p>
                </div>
              </div>

              <button
                onClick={handleStartTest}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Start Test
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Questions Stage */}
          {stage === 'questions' && !loading && currentQuestion && (
            <div className="space-y-6">
              {/* Progress */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>Score: {score}/{questions.length}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {currentQuestion.question}
                </h3>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => !showResult && setSelectedOption(index)}
                      disabled={showResult}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        showResult
                          ? index === correctOption
                            ? 'border-green-500 bg-green-50'
                            : index === selectedOption
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 bg-white'
                          : selectedOption === index
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1">{option}</span>
                        {showResult && index === correctOption && (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        )}
                        {showResult && index === selectedOption && index !== correctOption && (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Result Message */}
              {showResult && (
                <div className={`rounded-xl p-4 ${isCorrect ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
                  <div className="flex items-center gap-3">
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                      {isCorrect ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                {!showResult ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null || loading}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Answer'}
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 font-medium"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Test'}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && stage === 'questions' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
              <p className="text-gray-600">Loading questions...</p>
            </div>
          )}

          {/* Complete Stage */}
          {stage === 'complete' && (
            <div className="text-center space-y-6">
              <div className="inline-block p-4 bg-green-100 rounded-full">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Test Complete!</h3>
                <p className="text-gray-600 mb-4">You've completed all questions</p>
                
                <div className="bg-indigo-50 rounded-xl p-6 mb-6">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">
                    {score} / {questions.length}
                  </div>
                  <div className="text-gray-600">
                    {Math.round((score / questions.length) * 100)}% Correct
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestModal;