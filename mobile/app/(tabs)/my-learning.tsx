import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { useDownloads } from '../../src/context/DownloadContext';

export default function MyLearningScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { downloads, deleteDownload, storageInfo, refreshDownloads } = useDownloads();

  const [activeTab, setActiveTab] = useState<'batches' | 'downloads'>('batches');
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProgress = async () => {
    if (!user) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await mobileApi.getMyLearningProgress();
      setSummary(data);
    } catch (err) {
      console.warn('Could not load online progress (may be offline):', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProgress();
    refreshDownloads();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProgress();
    refreshDownloads();
  };

  const handleDeleteDownload = (lectureId: string, title: string) => {
    Alert.alert(
      'Delete Download',
      `Delete "${title}" from device storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDownload(lectureId),
        },
      ]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      {/* Top Segmented Controls */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'batches' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('batches')}
        >
          <Ionicons
            name="book-outline"
            size={16}
            color={activeTab === 'batches' ? '#2563eb' : '#64748b'}
          />
          <Text style={[styles.segmentText, activeTab === 'batches' && styles.segmentTextActive]}>
            Enrolled Batches
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'downloads' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('downloads')}
        >
          <Ionicons
            name="download-outline"
            size={16}
            color={activeTab === 'downloads' ? '#2563eb' : '#64748b'}
          />
          <Text style={[styles.segmentText, activeTab === 'downloads' && styles.segmentTextActive]}>
            Downloads ({downloads.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Enrolled Batches */}
      {activeTab === 'batches' && (
        <>
          {!user ? (
            <View style={styles.centerContainer}>
              <Ionicons name="lock-closed-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Sign in to view your learning</Text>
              <Text style={styles.emptySubtitle}>
                Track your batch courses, quiz performance, and saved video positions.
              </Text>
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Text style={styles.signInBtnText}>Go to Account</Text>
              </TouchableOpacity>
            </View>
          ) : isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading progress...</Text>
            </View>
          ) : (
            <FlatList
              data={summary?.batches || []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListHeaderComponent={
                <View style={styles.statsCard}>
                  <Text style={styles.statsGreeting}>Hello, {user.full_name}!</Text>
                  <Text style={styles.statsSub}>Here is your learning summary</Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{summary?.enrolled_batches_count || 0}</Text>
                      <Text style={styles.statLabel}>Batches</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{summary?.total_completed_lectures || 0}</Text>
                      <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{summary?.quizzes_passed || 0}</Text>
                      <Text style={styles.statLabel}>Quizzes Passed</Text>
                    </View>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <View style={[styles.centerContainer, { paddingTop: 40 }]}>
                  <Ionicons name="book-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No batches enrolled yet</Text>
                  <TouchableOpacity
                    style={styles.browseBtn}
                    onPress={() => router.push('/(tabs)')}
                  >
                    <Text style={styles.browseBtnText}>Explore Public Batches</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.batchCard}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/batch/${item.id}`)}
                >
                  <View style={styles.batchHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.categoryLabel}>{item.category}</Text>
                      <Text style={styles.batchTitle}>{item.title}</Text>
                      <Text style={styles.educatorLabel}>By {item.educator_name}</Text>
                    </View>
                    <Text style={styles.percentageText}>{item.progress_percentage}%</Text>
                  </View>

                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${item.progress_percentage}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.batchFooter}>
                    <Text style={styles.progressDetail}>
                      {item.completed_lectures} of {item.total_lectures} lectures completed
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#2563eb" />
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      {/* Tab 2: Offline Downloads */}
      {activeTab === 'downloads' && (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.storageHeaderCard}>
              <View style={styles.storageHeaderLeft}>
                <Ionicons name="phone-portrait-outline" size={24} color="#2563eb" />
                <View>
                  <Text style={styles.storageTitle}>Offline Storage Used</Text>
                  <Text style={styles.storageSub}>
                    {storageInfo.formatted} • {downloads.length} lecture{downloads.length === 1 ? '' : 's'} saved
                  </Text>
                </View>
              </View>
              <View style={styles.offlineStatusChip}>
                <Ionicons name="checkmark-done" size={14} color="#059669" />
                <Text style={styles.offlineStatusChipText}>Available Offline</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={[styles.centerContainer, { paddingTop: 60 }]}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cloud-download-outline" size={36} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No Offline Downloads</Text>
              <Text style={styles.emptySubtitle}>
                Download lectures to watch them anytime on the go without consuming mobile data or needing internet!
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={styles.browseBtnText}>Browse Available Lectures</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.downloadItemCard}>
              <TouchableOpacity
                style={styles.downloadItemMain}
                activeOpacity={0.8}
                onPress={() => router.push(`/lecture/${item.id}`)}
              >
                <View style={styles.playIconBox}>
                  <Ionicons name="play" size={20} color="#2563eb" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.downloadBatchName}>{item.batchTitle || 'Course Batch'}</Text>
                  <Text style={styles.downloadLectureTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.downloadMetaRow}>
                    <Text style={styles.downloadMetaText}>
                      {Math.floor(item.durationSeconds / 60)} mins
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.downloadMetaText}>{formatFileSize(item.fileSizeBytes)}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.downloadMetaSaved}>Saved</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.trashBtn}
                onPress={() => handleDeleteDownload(item.id, item.title)}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#eff6ff',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  statsCard: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  statsGreeting: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  statsSub: {
    fontSize: 12,
    color: '#bfdbfe',
    marginTop: 2,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    padding: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 10,
    color: '#e0f2fe',
    marginTop: 2,
  },
  batchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  batchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  educatorLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
    marginLeft: 8,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginTop: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  batchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressDetail: {
    fontSize: 11,
    color: '#94a3b8',
  },
  storageHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  storageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  storageSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  offlineStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offlineStatusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  downloadItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  downloadItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBatchName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  downloadLectureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  downloadMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  downloadMetaText: {
    fontSize: 11,
    color: '#64748b',
  },
  metaDot: {
    fontSize: 11,
    color: '#cbd5e1',
    marginHorizontal: 4,
  },
  downloadMetaSaved: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  trashBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    marginLeft: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
    maxWidth: 280,
  },
  signInBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  signInBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  browseBtn: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  browseBtnText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
});
