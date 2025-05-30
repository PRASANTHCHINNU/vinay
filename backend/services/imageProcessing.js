const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');

class ImageProcessor {
  constructor() {
    this.worker = null;
  }

  async initialize() {
    if (!this.worker) {
      this.worker = await createWorker('eng');
    }
  }

  async preprocessImage(imagePath) {
    try {
      // Enhance image for better OCR
      const processedImagePath = path.join(
        path.dirname(imagePath),
        'processed_' + path.basename(imagePath)
      );

      await sharp(imagePath)
        .resize(2000, null, { // Resize to reasonable width while maintaining aspect ratio
          withoutEnlargement: true
        })
        .sharpen() // Sharpen the image
        .normalize() // Normalize the image contrast
        .threshold(128) // Convert to black and white
        .toFile(processedImagePath);

      return processedImagePath;
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      throw error;
    }
  }

  async extractTextFromImage(imagePath) {
    try {
      await this.initialize();
      
      // Preprocess the image
      const processedImagePath = await this.preprocessImage(imagePath);
      
      // Perform OCR
      const { data: { text } } = await this.worker.recognize(processedImagePath);
      
      return this.parseQuizContent(text);
    } catch (error) {
      console.error('Text extraction failed:', error);
      throw error;
    }
  }

  parseQuizContent(text) {
    console.log('Raw text from image:', text);
    
    // Split text into lines and remove empty lines
    const lines = text.split('\n').filter(line => line.trim());
    console.log('Processed lines:', lines);
    
    let questions = [];
    let currentQuestion = null;
    let currentOptions = [];
    let currentCorrectAnswer = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Match question pattern: starts with a number
      if (/^\d+[\.\)]/.test(line)) {
        // Save previous question if complete
        if (currentQuestion && currentOptions.length === 4 && currentCorrectAnswer !== null) {
          questions.push({
            question: currentQuestion,
            options: [...currentOptions],
            correctAnswer: currentCorrectAnswer,
            marks: 1
          });
        }
        
        currentQuestion = line;
        currentOptions = [];
        currentCorrectAnswer = null;
        continue;
      }
      
      // Match option pattern: starts with A-D followed by space or dot or parenthesis
      const optionMatch = line.match(/^([A-D])(?:[\.\)\s]+)(.+)/);
      if (optionMatch) {
        currentOptions.push(optionMatch[2].trim());
        continue;
      }
      
      // Match correct answer pattern
      const answerMatch = line.toLowerCase().match(/correct\s*answer\s*[:\-\s]\s*([a-d])/);
      if (answerMatch) {
        currentCorrectAnswer = answerMatch[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
        
        // Save question if we have all components
        if (currentQuestion && currentOptions.length === 4) {
          questions.push({
            question: currentQuestion,
            options: [...currentOptions],
            correctAnswer: currentCorrectAnswer,
            marks: 1
          });
          
          currentQuestion = null;
          currentOptions = [];
          currentCorrectAnswer = null;
        }
      }
    }
    
    // Add last question if complete
    if (currentQuestion && currentOptions.length === 4 && currentCorrectAnswer !== null) {
      questions.push({
        question: currentQuestion,
        options: [...currentOptions],
        correctAnswer: currentCorrectAnswer,
        marks: 1
      });
    }
    
    console.log('Parsed questions:', questions);
    
    if (questions.length === 0) {
      throw new Error('No valid questions could be extracted from the image. Make sure each question has 4 options and a correct answer.');
    }
    
    return {
      questions,
      totalMarks: questions.length // Each question is worth 1 mark
    };
  }

  convertAnswerToIndex(answer) {
    // Convert A, B, C, D to 0, 1, 2, 3 (case insensitive)
    if (answer.match(/[A-Da-d]/)) {
      return answer.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    }
    // Convert 1, 2, 3, 4 to 0, 1, 2, 3
    return parseInt(answer) - 1;
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

module.exports = new ImageProcessor(); 