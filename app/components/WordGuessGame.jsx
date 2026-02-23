import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from "expo-router";
import WORDS from '../data/words.json'; // <-- Import the JSON

// Flower images array - you'll need to replace these with your actual image paths
const FLOWER_IMAGES = {
  5: require('../../assets/img/flowerGuess/flower5p.png'), // Full flower
  4: require('../../assets/img/flowerGuess/flower4p.png'),
  3: require('../../assets/img/flowerGuess/flower3p.png'),
  2: require('../../assets/img/flowerGuess/flower2p.png'),
  1: require('../../assets/img/flowerGuess/flower1p.png'),
  0: require('../../assets/img/flowerGuess/flower0p.png'), // No petals
};

const WordGuessGame = () => {
  // Get the word and hints from navigation params
 const randomIndex = Math.floor(Math.random() * WORDS.length);
const initialData = WORDS[randomIndex];

const [word, setWord] = useState(initialData.word.toUpperCase());
const [hints, setHints] = useState(initialData.hints);
const [guessedLetters, setGuessedLetters] = useState([]);
const [wrongLetters, setWrongLetters] = useState([]);
const [remainingChances, setRemainingChances] = useState(5);
const [gameStatus, setGameStatus] = useState('playing');
const [revealedHints, setRevealedHints] = useState([0]);
  // Alphabet for letter buttons
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Check if the word is completely guessed
 useEffect(() => {
    if (gameStatus === 'playing') {
      const allGuessed = word
        .split('')
        .every((letter) => guessedLetters.includes(letter) || letter === ' ');

      if (allGuessed && word.length > 0) {
        setGameStatus('won');
        Alert.alert('Congratulations!', 'You guessed the word correctly!');
      }
    }
  }, [guessedLetters]);

  // Check if game is lost
  useEffect(() => {
    if (remainingChances === 0 && gameStatus === 'playing') {
      setGameStatus('lost');
      Alert.alert('Game Over', `The word was: ${word}`);
    }
  }, [remainingChances]);

  const handleLetterPress = (letter) => {
    if (gameStatus !== 'playing') return;
    if (guessedLetters.includes(letter) || wrongLetters.includes(letter)) return;

    if (word.includes(letter)) {
      setGuessedLetters([...guessedLetters, letter]);
    } else {
      setWrongLetters([...wrongLetters, letter]);
      const newChances = remainingChances - 1;
      setRemainingChances(newChances);

      if (newChances > 0 && revealedHints.length < hints.length) {
        setRevealedHints([...revealedHints, revealedHints.length]);
      }
    }
  };
 const renderWord = () =>
    word.split('').map((letter, index) => {
      if (letter === ' ') return <View key={index} style={styles.space} />;

      const isGuessed = guessedLetters.includes(letter);
      return (
        <View key={index} style={styles.letterBox}>
          <Text style={styles.letterText}>{isGuessed ? letter : ''}</Text>
          <View style={styles.underline} />
        </View>
      );
    });

  const resetGame = () => {
  const newIndex = Math.floor(Math.random() * WORDS.length);
  const newData = WORDS[newIndex];

  setWord(newData.word.toUpperCase());
  setHints(newData.hints);
  setGuessedLetters([]);
  setWrongLetters([]);
  setRemainingChances(5);
  setGameStatus('playing');
  setRevealedHints([0]);
};


   

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Flower Image */}
        <View style={styles.flowerContainer}>
          <Image
            source={FLOWER_IMAGES[remainingChances]}
            style={styles.flowerImage}
            resizeMode="cover"
          />
          <Text style={styles.chancesText}>
            Chances Remaining: {remainingChances}
          </Text>
        </View>

        {/* Hints */}
        <View style={styles.hintsContainer}>
          <Text style={styles.hintsTitle}>Hints:</Text>
          {Array.isArray(hints) &&
            hints.map(
              (hint, index) =>
                revealedHints.includes(index) && (
                  <Text key={index} style={styles.hintText}>
                    {index + 1}. {hint}
                  </Text>
                )
            )}
        </View>

        {/* Word Display */}
        <View style={styles.wordContainer}>
          {renderWord()}
        </View>

        {/* Wrong Letters Display */}
        {wrongLetters.length > 0 && (
          <View style={styles.wrongLettersContainer}>
            <Text style={styles.wrongLettersTitle}>Wrong Guesses:</Text>
            <View style={styles.wrongLettersList}>
              {wrongLetters.map((letter, index) => (
                <Text key={index} style={styles.wrongLetter}>
                  {letter}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Alphabet Keyboard */}
        <View style={styles.keyboardContainer}>
          {alphabet.map((letter) => {
            const isGuessed = guessedLetters.includes(letter);
            const isWrong = wrongLetters.includes(letter);
            const isDisabled = isGuessed || isWrong || gameStatus !== 'playing';

            return (
              <TouchableOpacity
                key={letter}
                style={[
                  styles.letterButton,
                  isGuessed && styles.correctButton,
                  isWrong && styles.wrongButton,
                  isDisabled && styles.disabledButton,
                ]}
                onPress={() => handleLetterPress(letter)}
                disabled={isDisabled}
              >
                <Text
                  style={[
                    styles.letterButtonText,
                    (isGuessed || isWrong) && styles.usedLetterText,
                  ]}
                >
                  {letter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reset Button */}
        {gameStatus !== 'playing' && (
          <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
            <Text style={styles.resetButtonText}>Play Again</Text>
          </TouchableOpacity>
        )}

        {/* Game Status */}
        {gameStatus === 'won' && (
          <View style={styles.statusContainer}>
            <Text style={styles.winText}>🎉 You Won! 🎉</Text>
          </View>
        )}
        {gameStatus === 'lost' && (
          <View style={styles.statusContainer}>
            <Text style={styles.loseText}>Game Over!</Text>
            <Text style={styles.correctWordText}>
              The word was: {word.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 10,
    alignItems: 'center',
   
  },
  flowerContainer: {
    alignItems: 'center',
   // marginVertical: 10,
  
  },
  flowerImage: {
    width: 200,
    height: 180,
  },
  chancesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  hintsContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
   // marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hintsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a90e2',
    marginBottom: 10,
  },
  hintText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  wordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  letterBox: {
    alignItems: 'center',
    marginHorizontal: 5,
    marginVertical: 5,
  },
  letterText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  underline: {
    width: 30,
    height: 3,
    backgroundColor: '#4a90e2',
    marginTop: 5,
  },
  space: {
    width: 15,
  },
  wrongLettersContainer: {
    width: '100%',
    backgroundColor: '#ffe6e6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  wrongLettersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  wrongLettersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wrongLetter: {
    fontSize: 18,
    color: '#d32f2f',
    marginRight: 10,
    fontWeight: 'bold',
  },
  keyboardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  letterButton: {
    width: 40,
    height: 40,
    backgroundColor: '#4a90e2',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
  },
  letterButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  correctButton: {
    backgroundColor: '#4caf50',
  },
  wrongButton: {
    backgroundColor: '#d32f2f',
  },
  disabledButton: {
    opacity: 0.5,
  },
  usedLetterText: {
    color: '#fff',
  },
  resetButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  winText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  loseText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  correctWordText: {
    fontSize: 20,
    color: '#666',
    marginTop: 10,
  },
});

export default WordGuessGame;
