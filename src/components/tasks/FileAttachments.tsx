import { useState, useRef } from 'react';
import { Upload, Download, Trash2, File, Image, FileText, Film } from 'lucide-react';
import type { Attachment } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

interface FileAttachmentsProps {
  taskId: string;
  attachments: Attachment[];
  onRefresh: () => void;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Film;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
  return File;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileAttachments({ taskId, attachments, onRefresh }: FileAttachmentsProps) {
  const { t } = useLanguage();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    try {
      const token = localStorage.getItem('auth_token');
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB limit`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!res.ok) {
          toast.error(`Failed to upload ${file.name}`);
        } else {
          toast.success(`${file.name} uploaded`);
        }
      }
      onRefresh();
    } catch (err) {
      toast.error('Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast.success('File deleted');
      onRefresh();
    } catch (err) {
      toast.error('Failed to delete file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleUpload(files);
    e.target.value = '';
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = `/api/attachments/${attachment.id}/download`;
    link.download = attachment.name;
    link.click();
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all",
          isDragOver
            ? "border-[var(--orange)] bg-[var(--orange)]/10"
            : "border-white/10 hover:border-white/20 hover:bg-white/5",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        {uploading ? (
          <div className="w-6 h-6 border-2 border-[var(--orange)] border-t-transparent rounded-full animate-spin" />
        ) : (
          <Upload className={cn("w-8 h-8", isDragOver ? "text-[var(--orange)]" : "text-gray-500")} />
        )}
        <p className="text-sm text-gray-400">
          {uploading
            ? (t.attachments?.uploading || 'Uploading...')
            : (t.attachments?.dropHere || 'Drop files here or click to upload')}
        </p>
        <p className="text-xs text-gray-500">
          {t.attachments?.maxSize || 'Max 10MB per file'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map(attachment => {
            const Icon = getFileIcon(attachment.type);
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 group hover:bg-white/8 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[var(--orange)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{attachment.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)} • {format(new Date(attachment.uploadedAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(attachment); }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(attachment.id); }}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
