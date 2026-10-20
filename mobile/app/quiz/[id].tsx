import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi } from '../../src/services/api';

export default function MobileQuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!id) return;
      try {
        const data = await mobileApi.getQuiz(id);
        setQuiz(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const selectOption = (questionId: string, optionId: string) => {
    if (result) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!quiz || isSubmitting) return;

    const answers = Object.entries(selectedAnswers).map(([question_id, selected_option_id]) => ({
      question_id,
      selected_option_id,
    }));

    setIsSubmitting(true);
    try {
      const res = await mobileApi.submitQuizAttempt(quiz.id, answers);
      setResult(res);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !quiz) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>{quiz.title}</Text>
      <Text style={styles.desc}>
        Passing: {quiz.passing_score}% • Max Attempts: {quiz.max_attempts}
      </Text>

      {/* Result Display */}
      {result ? (
        <View style={[styles.resultCard, result.passed ? styles.passedCard : styles.failedCard]}>
          <Ionicons
            name={result.passed ? 'trophy' : 'alert-circle'}
            size={40}
            color={result.passed ? '#059669' : '#dc2626'}
          />
          <Text style={styles.resultTitle}>
            {result.passed ? 'Assessment Passed!' : 'Assessment Incomplete'}
          </Text>
          <Text style={styles.resultScore}>
            Score: {result.score} / {result.max_score} ({result.percentage}%)
          </Text>
          <Text style={styles.resultSub}>
            Attempts left: {result.attempts_remaining}
          </Text>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.doneBtnText}>Return to Batch</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          {quiz.questions?.map((q: any, idx: number) => (
            <View key={q.id} style={styles.questionCard}>
              <Text style={styles.questionIndex}>Question {idx + 1} of {quiz.questions.length}</Text>
              <Text style={styles.questionPrompt}>{q.prompt}</Text>

              <View style={styles.optionsList}>
                {q.options.map((opt: any) => {
                  const isSelected = selectedAnswers[q.id] === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => selectOption(q.id, opt.id)}
                    >
                      <View style={[styles.radio, isSelected && styles.radioSelected]} />
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {opt.option_text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitBtn, Object.keys(selectedAnswers).length === 0 && { opacity: 0.5 }]}
            disabled={isSubmitting || Object.keys(selectedAnswers).length === 0}
            onPress={handleSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Assessment</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  desc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  questionIndex: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  questionPrompt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  optionItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  radioSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  optionText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  optionTextSelected: {
    color: '#1e3a8a',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
  },
  passedCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  failedCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
  },
  resultScore: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  resultSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  doneBtn: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
