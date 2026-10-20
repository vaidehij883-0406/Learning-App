import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Linking, Alert
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi } from '../../src/services/api';
import { useDownloads } from '../../src/context/DownloadContext';

export default function LecturePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const videoRef = useRef<Video>(null);

  const {
    downloads,
    activeDownloads,
    isDownloaded,
    getLocalUri,
    startDownload,
    cancelDownload,
    deleteDownload,
  } = useDownloads();

  const [lecture, setLecture] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);

  useEffect(() => {
    const fetchLecture = async () => {
      if (!id) return;
      try {
        const data = await mobileApi.getLecture(id);
        setLecture(data);
      } catch (err) {
        console.warn('Network request failed, attempting offline lecture load:', err);
        // Fallback for offline viewing from local storage
        const local = downloads.find((d) => d.id === id);
        if (local) {
          setLecture({
            id: local.id,
            title: local.title,
            description: local.description,
            duration_seconds: local.durationSeconds,
            sequence_order: local.sequenceOrder,
            video_url: local.localUri,
            batch_title: local.batchTitle,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchLecture();
  }, [id, downloads]);

  // Save progress periodically (online only)
  const handlePlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus);
    if (playbackStatus.isLoaded && playbackStatus.isPlaying && lecture) {
      const positionSec = Math.floor(playbackStatus.positionMillis / 1000);
      const durationSec = playbackStatus.durationMillis
        ? Math.floor(playbackStatus.durationMillis / 1000)
        : lecture.duration_seconds;

      // Every 10 seconds, sync progress with server if online
      if (positionSec > 0 && positionSec % 10 === 0) {
        mobileApi.saveProgress(lecture.id, positionSec, durationSec).catch(() => {});
      }
    }
  };

  const downloaded = id ? isDownloaded(id) : false;
  const localUri = id ? getLocalUri(id) : null;
  const activeDownload = id ? activeDownloads[id] : undefined;

  const handleDownloadPress = () => {
    if (!lecture) return;

    if (activeDownload?.isDownloading) {
      Alert.alert(
        'Cancel Download',
        'Do you want to stop and cancel this download?',
        [
          { text: 'Keep Downloading', style: 'cancel' },
          { text: 'Cancel Download', style: 'destructive', onPress: () => cancelDownload(lecture.id) },
        ]
      );
      return;
    }

    if (downloaded) {
      Alert.alert(
        'Downloaded Lecture',
        `"${lecture.title}" is saved for offline watching.`,
        [
          { text: 'Keep Video', style: 'cancel' },
          {
            text: 'Delete Download',
            style: 'destructive',
            onPress: () => deleteDownload(lecture.id),
          },
        ]
      );
      return;
    }

    // Start download
    startDownload({
      id: lecture.id,
      title: lecture.title,
      description: lecture.description,
      batch_id: lecture.batch_id,
      batch_title: lecture.batch_title,
      duration_seconds: lecture.duration_seconds,
      sequence_order: lecture.sequence_order,
      video_url: lecture.video_url,
    });
  };

  if (isLoading || !lecture) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // Use local URI if downloaded, otherwise remote URL
  const effectiveVideoUri = localUri || lecture.video_url;
  const initialMillis = (lecture.user_progress?.last_position_seconds || 0) * 1000;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Video Player Box */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: effectiveVideoUri }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping={false}
          positionMillis={initialMillis}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
      </View>

      {/* Offline playback banner */}
      {downloaded && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={15} color="#059669" />
          <Text style={styles.offlineBannerText}>
            Offline Ready • Playing from local device storage
          </Text>
        </View>
      )}

      {/* Metadata & YouTube-Style Action Bar */}
      <View style={styles.content}>
        <View style={styles.sequenceBadge}>
          <Text style={styles.sequenceBadgeText}>Lecture {lecture.sequence_order || 1}</Text>
        </View>

        <Text style={styles.title}>{lecture.title}</Text>
        <Text style={styles.desc}>{lecture.description || 'No description provided.'}</Text>

        {/* YouTube-Style Actions Row */}
        <View style={styles.actionsBar}>
          {/* YouTube Offline Download Button */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              downloaded && styles.actionBtnDownloaded,
              activeDownload?.isDownloading && styles.actionBtnDownloading,
            ]}
            onPress={handleDownloadPress}
            activeOpacity={0.7}
          >
            {activeDownload?.isDownloading ? (
              <>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.actionBtnDownloadingText}>
                  {Math.round((activeDownload.progress || 0) * 100)}% Downloading...
                </Text>
              </>
            ) : downloaded ? (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={styles.actionBtnDownloadedText}>Downloaded</Text>
              </>
            ) : (
              <>
                <Ionicons name="arrow-down-circle-outline" size={18} color="#0f172a" />
                <Text style={styles.actionBtnText}>Download</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Share Action */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              Alert.alert('Share', `Share "${lecture.title}" with fellow learners.`);
            }}
          >
            <Ionicons name="share-social-outline" size={18} color="#0f172a" />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        {lecture.user_progress && lecture.user_progress.last_position_seconds > 0 && (
          <View style={styles.resumeInfo}>
            <Ionicons name="time-outline" size={16} color="#2563eb" />
            <Text style={styles.resumeText}>
              Resumed at {Math.floor(lecture.user_progress.last_position_seconds / 60)} minutes
            </Text>
          </View>
        )}

        {/* Resources */}
        {lecture.resources && lecture.resources.length > 0 && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Attached PDF Notes</Text>
            {lecture.resources.map((res: any) => (
              <TouchableOpacity
                key={res.id}
                style={styles.noteItem}
                onPress={() => Linking.openURL(res.file_url)}
              >
                <Ionicons name="document-text-outline" size={20} color="#dc2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteTitle}>{res.title}</Text>
                  <Text style={styles.noteSub}>Tap to open PDF</Text>
                </View>
                <Ionicons name="download-outline" size={18} color="#2563eb" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#a7f3d0',
  },
  offlineBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  content: {
    padding: 16,
  },
  sequenceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  sequenceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  desc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 18,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  actionBtnDownloaded: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  actionBtnDownloadedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  actionBtnDownloading: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionBtnDownloadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  resumeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  resumeText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    gap: 10,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  noteSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
