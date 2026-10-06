import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlacementTestResult } from './placement-test-result.entity.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PlacementQuestion {
  id: number;
  type: 'vocab' | 'grammar' | 'reading';
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  passage?: string; // For reading questions
}

@Injectable()
export class PlacementTestService {
  private questions: PlacementQuestion[] = [];

  constructor(
    @InjectRepository(PlacementTestResult)
    private readonly resultRepo: Repository<PlacementTestResult>,
  ) {
    this.loadQuestions();
  }

  private loadQuestions() {
    // Generate a simple set of questions dynamically or load from JSON.
    // For now, let's create a static robust set in memory.
    this.questions = [
      // Vocabulary (A1 - C1)
      { id: 1, type: 'vocab', question: 'I usually have a cup of ___ in the morning.', options: ['coffee', 'book', 'shoe', 'chair'], correctAnswerIndex: 0 },
      { id: 2, type: 'vocab', question: 'The flight was ___ due to bad weather.', options: ['delayed', 'hurried', 'advanced', 'promoted'], correctAnswerIndex: 0 },
      { id: 3, type: 'vocab', question: 'His explanation was completely ___ ; no one understood it.', options: ['incomprehensible', 'lucid', 'transparent', 'explicit'], correctAnswerIndex: 0 },
      { id: 4, type: 'vocab', question: 'She is extremely ___ about her achievements and never boasts.', options: ['modest', 'arrogant', 'proud', 'vain'], correctAnswerIndex: 0 },
      { id: 5, type: 'vocab', question: 'The new regulations will ___ next month.', options: ['take effect', 'make effect', 'give effect', 'do effect'], correctAnswerIndex: 0 },

      // Grammar (A1 - C1)
      { id: 6, type: 'grammar', question: 'She ___ to the store every Sunday.', options: ['go', 'goes', 'going', 'gone'], correctAnswerIndex: 1 },
      { id: 7, type: 'grammar', question: 'If I ___ you, I would study harder.', options: ['am', 'was', 'were', 'will be'], correctAnswerIndex: 2 },
      { id: 8, type: 'grammar', question: 'By the time we arrived, the movie ___ already started.', options: ['has', 'have', 'had', 'was'], correctAnswerIndex: 2 },
      { id: 9, type: 'grammar', question: 'Hardly ___ when the phone rang.', options: ['had I entered', 'I had entered', 'did I enter', 'I entered'], correctAnswerIndex: 0 },
      { id: 10, type: 'grammar', question: 'I wish I ___ more time to finish the project.', options: ['have', 'had', 'will have', 'can have'], correctAnswerIndex: 1 },

      // Reading (A2 - B2)
      { id: 11, type: 'reading', passage: 'The city council decided to construct a new park in the downtown area. This park will feature a large playground, a botanical garden, and several walking trails. The construction is expected to take six months.', question: 'What is the main purpose of the new park construction?', options: ['To build a new shopping mall', 'To provide recreational facilities', 'To increase traffic in downtown', 'To replace the old city council'], correctAnswerIndex: 1 },
      { id: 12, type: 'reading', passage: 'Solar energy is becoming increasingly popular as a renewable energy source. Despite its high initial installation costs, it significantly reduces electricity bills in the long run and has a minimal environmental footprint.', question: 'What is mentioned as a disadvantage of solar energy?', options: ['It increases electricity bills', 'It has a large environmental footprint', 'High initial installation costs', 'It is not a renewable energy source'], correctAnswerIndex: 2 },
      { id: 13, type: 'reading', passage: 'The CEO announced a restructuring of the company aimed at improving operational efficiency. Several departments will be merged, and some management roles will be redefined. Employees have been assured that no layoffs will occur during this process.', question: 'What did the CEO assure the employees?', options: ['Salaries will be increased', 'No layoffs will occur', 'New departments will be created', 'Operational efficiency is poor'], correctAnswerIndex: 1 },
      { id: 14, type: 'reading', passage: 'In recent years, the decline of bee populations has alarmed scientists worldwide. Bees play a crucial role in pollinating crops, and their decline poses a severe threat to global food security. Efforts are underway to reduce pesticide use and preserve natural habitats.', question: 'Why is the decline of bees alarming?', options: ['They produce too much honey', 'They are dangerous to humans', 'They are crucial for pollinating crops', 'They consume too many pesticides'], correctAnswerIndex: 2 },
      { id: 15, type: 'reading', passage: 'Artificial intelligence has revolutionized various industries by automating routine tasks and analyzing large datasets rapidly. However, ethical concerns regarding data privacy and algorithmic bias remain a subject of intense debate among policymakers and technologists.', question: 'What is a major concern associated with artificial intelligence?', options: ['It cannot analyze large datasets', 'It increases manual labor', 'Data privacy and algorithmic bias', 'It has not revolutionized any industry'], correctAnswerIndex: 2 }
    ];
  }

  getQuestions() {
    // Return questions without the correctAnswerIndex
    return this.questions.map(q => {
      const { correctAnswerIndex, explanation, ...rest } = q;
      return rest;
    });
  }

  async submitTest(userId: number, answers: { questionId: number, selectedAnswerIndex: number }[]) {
    let vocabScore = 0;
    let grammarScore = 0;
    let readingScore = 0;
    let maxVocab = 0;
    let maxGrammar = 0;
    let maxReading = 0;

    for (const q of this.questions) {
      if (q.type === 'vocab') maxVocab++;
      if (q.type === 'grammar') maxGrammar++;
      if (q.type === 'reading') maxReading++;

      const answer = answers.find(a => a.questionId === q.id);
      if (answer && answer.selectedAnswerIndex === q.correctAnswerIndex) {
        if (q.type === 'vocab') vocabScore++;
        if (q.type === 'grammar') grammarScore++;
        if (q.type === 'reading') readingScore++;
      }
    }

    const totalScore = vocabScore + grammarScore + readingScore;
    const maxScore = maxVocab + maxGrammar + maxReading;
    const percentage = totalScore / maxScore;

    let estimatedLevel = 'A1';
    let recommendedAction = 'Start with basic vocabulary and grammar courses.';

    if (percentage >= 0.9) {
      estimatedLevel = 'C1/C2';
      recommendedAction = 'You have excellent proficiency. Focus on advanced materials and native content.';
    } else if (percentage >= 0.7) {
      estimatedLevel = 'B2';
      recommendedAction = 'You have a solid upper-intermediate level. Work on complex grammar and diverse vocabulary.';
    } else if (percentage >= 0.5) {
      estimatedLevel = 'B1';
      recommendedAction = 'You are at an intermediate level. Practice reading and expand your vocabulary.';
    } else if (percentage >= 0.3) {
      estimatedLevel = 'A2';
      recommendedAction = 'You have basic knowledge. Build your foundational grammar and vocabulary.';
    }

    // Notice about speaking/writing limits
    recommendedAction += ' (Note: This is an estimate based on receptive skills only. Speaking and writing are not evaluated here.)';

    const result = this.resultRepo.create({
      userId,
      totalScore,
      maxScore,
      vocabScore,
      grammarScore,
      readingScore,
      estimatedLevel,
      recommendedAction,
    });

    await this.resultRepo.save(result);

    return result;
  }

  async getHistory(userId: number) {
    return this.resultRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
