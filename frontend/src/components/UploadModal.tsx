import React, { useState } from 'react';
import { api } from '../api/client';
import { Lecture } from '../types';
import {
  X, UploadCloud, Video, FileText, CheckCircle2,
  AlertCircle, Film, Sparkles, Loader2
} from 'lucide-react';

interface UploadModalProps {
  batchId: string;
  onClose: () => void;
  onSuccess: (lecture: Lecture) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ batchId, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Core Architecture');
  const [sequenceOrder, setSequenceOrder] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [isPublished, setIsPublished] = useState(true);
  const [isPublicPreview, setIsPublicPreview] = useState(true);

  // Files
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('url');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a lecture title');
      return;
    }

    let finalVideoUrl = videoUrlInput.trim();

    setIsUploading(true);
    setErrorMessage(null);

    try {
      // 1. If file selected, perform direct storage upload
      if (uploadMode === 'file' && videoFile) {
        finalVideoUrl = await api.uploadDirect(videoFile, 'videos', (pct) => {
          setUploadProgress(pct);
        });
      }

      if (!finalVideoUrl) {
        // Fallback sample high-grade test video stream if none provided
        finalVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      }

      // 2. Create lecture record in database
      const createdLecture = await api.createLecture({
        batch_id: batchId,
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
        duration_seconds: durationMinutes * 60,
        video_url: finalVideoUrl,
        sequence_order: sequenceOrder,
        is_published: isPublished,
        is_public_preview: isPublicPreview,
      });

      // 3. If PDF notes attached, upload and attach resource
      if (pdfFile) {
        const pdfUrl = await api.uploadDirect(pdfFile, 'notes');
        await api.addResource(createdLecture.id, {
          title: pdfFile.name,
          file_url: pdfUrl,
          file_size_bytes: pdfFile.size,
        });
      }

      onSuccess(createdLecture);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.detail || 'Failed to upload lecture.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload New Lecture</h3>
              <p className="text-xs text-slate-500">Add video lectures and companion study notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateLecture} className="p-6 space-y-4 text-left overflow-y-auto max-h-[75vh]">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lecture Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Database Consistency Models"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of concepts covered in this video..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Module</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approx. Duration (min)</label>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 10)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Video Media Source */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">Video Source</label>
              <div className="flex gap-1 text-[11px] bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    uploadMode === 'url' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Direct Stream URL
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    uploadMode === 'file' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {uploadMode === 'url' ? (
              <input
                type="url"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="https://...mp4 or HLS video stream URL"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  id="video-upload"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                  <UploadCloud className="w-8 h-8 text-blue-500 mb-1" />
                  <span className="text-xs font-semibold text-slate-700">
                    {videoFile ? videoFile.name : 'Select video file (MP4, WebM, MOV)'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Direct upload to storage'}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Attach PDF notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Attach PDF Notes (Optional)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50">
                <span className="text-xs text-slate-600 truncate">
                  {pdfFile ? pdfFile.name : 'Choose PDF document...'}
                </span>
                <FileText className="w-4 h-4 text-slate-400" />
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {pdfFile && (
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  className="text-xs text-rose-500 hover:text-rose-700 px-2 font-medium"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Upload Progress Bar if active */}
          {isUploading && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Status Checkboxes */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              Publish immediately
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublicPreview}
                onChange={(e) => setIsPublicPreview(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              Allow Public Preview
            </label>
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving & Processing Lecture...
                </>
              ) : (
                'Save Lecture & Publish'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
