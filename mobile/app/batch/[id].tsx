import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { useDownloads } from '../../src/context/DownloadContext';

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const {
    isDownloaded,
    activeDownloads,
    startDownload,
    deleteDownload,
  } = useDownloads();

  const [batch, setBatch] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const loadBatch = async () => {
    if (!id) return;
    try {
      const [batchData, lecturesData] = await Promise.all([
        mobileApi.getBatch(id),
        mobileApi.getLectures(id),
      ]);
      setBatch(batchData);
      setLectures(lecturesData);

      if (batchData.is_enrolled || user?.role === 'educator') {
        const qData = await mobileApi.getQuizzes(id);
        setQuizzes(qData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatch();
  }, [id, user]);

  const handleEnroll = async () => {
    if (!user) {
      Alert.alert('Sign in Required', 'Please sign in to enroll in this batch.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(tabs)/profile') },
      ]);
      return;
    }
    setIsEnrolling(true);
    try {
      await mobileApi.enrollBatch(id!);
      await loadBatch();
      Alert.alert('Enrolled!', 'You have successfully joined this batch.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to enroll');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading || !batch) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Category & Title */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{batch.category}</Text>
      </View>
      <Text style={styles.title}>{batch.title}</Text>
      <Text style={styles.desc}>{batch.description}</Text>

      {/* Educator */}
      <View style={styles.educatorRow}>
        <Ionicons name="person-circle-outline" size={24} color="#2563eb" />
        <Text style={styles.educatorName}>Instructor: {batch.educator?.full_name || 'Educator'}</Text>
      </View>

      {/* Enroll Button */}
      <View style={styles.enrollBox}>
        {batch.is_enrolled ? (
          <View style={styles.enrolledBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            <Text style={styles.enrolledText}>You are enrolled in this batch</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.enrollBtn}
            disabled={isEnrolling}
            onPress={handleEnroll}
          >
            {isEnrolling ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.enrollBtnText}>Join Batch for Free</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Curriculum */}
      <Text style={styles.sectionTitle}>Curriculum ({lectures.length} Lectures)</Text>
      <View style={styles.sectionCard}>
        {lectures.length === 0 ? (
          <Text style={styles.emptyText}>No lectures published yet.</Text>
        ) : (
          lectures.map((lec, idx) => {
            const canPlay = batch.is_enrolled || lec.is_public_preview;
            const downloaded = isDownloaded(lec.id);
            const activeDownload = activeDownloads[lec.id];

            return (
              <View
                key={lec.id}
                style={[styles.lectureItem, !canPlay && styles.lectureItemDisabled]}
              >
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
                  disabled={!canPlay}
                  onPress={() => router.push(`/lecture/${lec.id}`)}
                >
                  <View style={styles.seqCircle}>
                    <Text style={styles.seqText}>{lec.sequence_order || idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lectureTitle}>{lec.title}</Text>
                    <Text style={styles.durationText}>
                      {Math.floor(lec.duration_seconds / 60)} mins {lec.is_public_preview ? '• Free Preview' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Download / Play Actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {canPlay && (
                    <TouchableOpacity
                      onPress={() => {
                        if (activeDownload?.isDownloading) return;
                        if (downloaded) {
                          Alert.alert(
                            'Downloaded',
                            `"${lec.title}" is saved for offline viewing.`,
                            [
                              { text: 'Keep', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => deleteDownload(lec.id) },
                            ]
                          );
                        } else {
                          startDownload({
                            id: lec.id,
                            title: lec.title,
                            description: lec.description,
                            batch_id: batch.id,
                            batch_title: batch.title,
                            duration_seconds: lec.duration_seconds,
                            sequence_order: lec.sequence_order,
                            video_url: lec.video_url,
                          });
                        }
                      }}
                      style={styles.downloadIconBtn}
                    >
                      {activeDownload?.isDownloading ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : downloaded ? (
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                      ) : (
                        <Ionicons name="arrow-down-circle-outline" size={20} color="#64748b" />
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    disabled={!canPlay}
                    onPress={() => router.push(`/lecture/${lec.id}`)}
                  >
                    <Ionicons
                      name={canPlay ? 'play-circle' : 'lock-closed'}
                      size={24}
                      color={canPlay ? '#2563eb' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Quizzes */}
      {quizzes.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Assessments & Quizzes</Text>
          <View style={styles.sectionCard}>
            {quizzes.map((q) => (
              <TouchableOpacity
                key={q.id}
                style={styles.quizItem}
                onPress={() => router.push(`/quiz/${q.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.quizTitle}>{q.title}</Text>
                  <Text style={styles.quizDesc}>
                    Passing: {q.passing_score}% • Limit: {q.time_limit_minutes}m
                  </Text>
                </View>
                <View style={styles.quizBtn}>
                  <Text style={styles.quizBtnText}>Start</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 26,
  },
  desc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 18,
  },
  educatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  educatorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  enrollBox: {
    marginVertical: 18,
  },
  enrollBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  enrollBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  enrolledText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 10,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  lectureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  lectureItemDisabled: {
    opacity: 0.5,
  },
  downloadIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  seqCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  lectureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  durationText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  quizItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quizTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  quizDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  quizBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quizBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
