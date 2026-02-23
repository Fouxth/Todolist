import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, FileText, Palette } from 'lucide-react';
import type { CalendarEvent, User, Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  event?: CalendarEvent | null;
  users: User[];
  projects: Project[];
  currentUserId: string;
  defaultDate?: Date;
}

const eventTypes = [
  { value: 'task', label: 'งาน', icon: '📋', color: '#ff6b35' },
  { value: 'meeting', label: 'ประชุม', icon: '👥', color: '#2196f3' },
  { value: 'deadline', label: 'กำหนดส่ง', icon: '⏰', color: '#f44336' },
  { value: 'reminder', label: 'เตือนความจำ', icon: '🔔', color: '#ffc107' }
] as const;

export function EventModal({ isOpen, onClose, onSave, event, users, projects, currentUserId, defaultDate }: EventModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'task' | 'meeting' | 'deadline' | 'reminder'>('meeting');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [attendees, setAttendees] = useState<string[]>([currentUserId]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [color, setColor] = useState('#2196f3');

  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Edit mode
        setTitle(event.title);
        setDescription(event.description || '');
        setType(event.type);
        
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        
        setStartDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().slice(0, 5));
        setEndDate(end.toISOString().split('T')[0]);
        setEndTime(end.toTimeString().slice(0, 5));
        
        setAttendees(event.attendees && event.attendees.length > 0 ? event.attendees : [currentUserId]);
        setSelectedProjectId(event.projectId || '');
        setColor(event.color || '#2196f3');
      } else {
        // Create mode
        const now = defaultDate || new Date();
        const dateStr = now.toISOString().split('T')[0];
        
        setTitle('');
        setDescription('');
        setType('meeting');
        setStartDate(dateStr);
        setStartTime('09:00');
        setEndDate(dateStr);
        setEndTime('10:00');
        setAttendees([currentUserId]);
        setSelectedProjectId('');
        setColor('#2196f3');
      }
    }
  }, [isOpen, event, currentUserId, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || attendees.length === 0) return;

    setLoading(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);

      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        startTime: startDateTime,
        endTime: endDateTime,
        userId: currentUserId,
        attendees: attendees,
        projectId: selectedProjectId || undefined,
        color: color || undefined
      });

      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedType = eventTypes.find(t => t.value === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-[#1a1a1a]">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {event ? '✏️ แก้ไข Event' : '➕ เพิ่ม Event ใหม่'}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {event ? 'อัพเดทรายละเอียด event' : 'สร้าง event บนปฏิทิน'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--orange)]" />
              ชื่อ Event *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ประชุมทีม, Demo ให้ลูกค้า, Sprint Planning..."
              className="bg-white/5 border-white/10 text-white"
              required
              autoFocus
            />
          </div>

          {/* Type */}
          <div>
            <Label className="text-white mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--orange)]" />
              ประเภท
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {eventTypes.map((eventType) => (
                <button
                  key={eventType.value}
                  type="button"
                  onClick={() => {
                    setType(eventType.value);
                    setColor(eventType.color);
                  }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    "hover:scale-105 hover:shadow-lg",
                    type === eventType.value
                      ? "border-current shadow-lg scale-105"
                      : "border-white/10 hover:border-white/20"
                  )}
                  style={{
                    backgroundColor: type === eventType.value ? `${eventType.color}20` : 'transparent',
                    color: type === eventType.value ? eventType.color : '#9ca3af'
                  }}
                >
                  <div className="text-3xl mb-2">{eventType.icon}</div>
                  <div className="text-sm font-medium">{eventType.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-white mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-400" />
                วันที่เริ่มต้น *
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="startTime" className="text-white mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-400" />
                เวลาเริ่มต้น *
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-white mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-400" />
                วันที่สิ้นสุด *
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="endTime" className="text-white mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                เวลาสิ้นสุด *
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                required
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <Label className="text-white mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              ผู้เกี่ยวข้อง *
            </Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {users.map(user => {
                const isSelected = attendees.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        // Don't allow removing if it's the only one
                        if (attendees.length > 1) {
                          setAttendees(attendees.filter(id => id !== user.id));
                        }
                      } else {
                        setAttendees([...attendees, user.id]);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full border-2 transition-all",
                      isSelected
                        ? "border-[var(--orange)] bg-[var(--orange)]/20 text-[var(--orange)] scale-105"
                        : "border-white/20 bg-white/5 text-gray-400 hover:border-white/40 hover:bg-white/10"
                    )}
                  >
                    <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
                    <span className="text-sm font-medium">{user.name}</span>
                    {isSelected && (
                      <span className="ml-1">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            {attendees.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                เลือกแล้ว {attendees.length} คน - จะได้รับการแจ้งเตือน
              </p>
            )}
          </div>

          {/* Project (Optional) */}
          <div>
            <Label htmlFor="project" className="text-white mb-2">
              โปรเจกต์ (ถ้ามี)
            </Label>
            <select
              id="project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
            >
              <option value="">-- ไม่เลือกโปรเจกต์ --</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-white mb-2">
              รายละเอียด (ถ้ามี)
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="อธิบายรายละเอียด event..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 resize-none"
            />
          </div>

          {/* Preview */}
          {title && (
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="text-xs text-gray-400 mb-2">🔍 ตัวอย่าง:</div>
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-white text-sm">{title}</h4>
                  {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>📅 {startDate}</span>
                    <span>🕐 {startTime} - {endTime}</span>
                    <span>{selectedType?.icon} {selectedType?.label}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10"
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white"
              disabled={loading || !title.trim()}
            >
              {loading ? 'กำลังบันทึก...' : event ? '💾 บันทึก' : '➕ สร้าง Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
