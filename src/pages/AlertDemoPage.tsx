import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAlerts } from '@/hooks/useAlerts';
import { CheckCircle, XCircle, AlertTriangle, Info, Bell, Sparkles } from 'lucide-react';

export function AlertDemoPage() {
    const alerts = useAlerts();

    const demoAlerts = [
        {
            title: 'Success Alerts',
            icon: CheckCircle,
            color: 'text-green-500',
            tests: [
                {
                    label: 'Task Created',
                    action: () => alerts.success('สร้างงานใหม่แล้ว', '"ออกแบบ UI หน้า Dashboard" ถูกสร้างเรียบร้อยแล้ว', 4000)
                },
                {
                    label: 'Status Updated',
                    action: () => alerts.success('อัปเดตสถานะแล้ว', '"ทำ Login Page" → กำลังทำ', 3000)
                },
                {
                    label: 'Task Completed',
                    action: () => alerts.success('✅ งานเสร็จสิ้น', 'คุณทำงาน "Fix Bug" เสร็จแล้ว', 4000)
                },
            ]
        },
        {
            title: 'Error Alerts',
            icon: XCircle,
            color: 'text-red-500',
            tests: [
                {
                    label: 'Delete Failed',
                    action: () => alerts.error('ไม่สามารถลบได้', 'เกิดข้อผิดพลาดในการลบงาน กรุณาลองใหม่', 5000)
                },
                {
                    label: 'Network Error',
                    action: () => alerts.error('เชื่อมต่อล้มเหลว', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', 6000)
                },
                {
                    label: 'Permission Denied',
                    action: () => alerts.error('ไม่มีสิทธิ์', 'คุณไม่มีสิทธิ์ในการแก้ไขงานนี้', 5000)
                },
            ]
        },
        {
            title: 'Warning Alerts',
            icon: AlertTriangle,
            color: 'text-orange-500',
            tests: [
                {
                    label: 'Due Date Warning',
                    action: () => alerts.warning('⏰ งานใกล้ครบกำหนด', '"ส่งรายงาน Q4" จะครบกำหนดใน 2 ชั่วโมง', 6000)
                },
                {
                    label: 'Overdue Task',
                    action: () => alerts.warning('งานเกินกำหนด', 'คุณมี 3 งานที่เกินกำหนดแล้ว กรุณาตรวจสอบ', 0)
                },
                {
                    label: 'Unsaved Changes',
                    action: () => alerts.warning('มีการเปลี่ยนแปลงที่ยังไม่บันทึก', 'คุณต้องการออกโดยไม่บันทึกหรือไม่?', {
                        duration: 0,
                        action: { label: 'บันทึก', onClick: () => alert('Saved!') }
                    })
                },
            ]
        },
        {
            title: 'Info Alerts',
            icon: Info,
            color: 'text-blue-500',
            tests: [
                {
                    label: 'Task Assigned',
                    action: () => alerts.info('มีงานใหม่มอบหมายให้คุณ', 'สมชาย มอบหมายงาน "ทำ API Documentation" ให้คุณ', 6000)
                },
                {
                    label: 'New Comment',
                    action: () => alerts.info('มีความคิดเห็นใหม่', 'มานี แสดงความคิดเห็นในงาน "Review Code"', 5000)
                },
                {
                    label: 'Event Reminder',
                    action: () => alerts.info('📅 แจ้งเตือนกิจกรรม', 'ประชุมทีม Daily Standup จะเริ่มใน 15 นาที', {
                        duration: 8000,
                        action: { label: 'เข้าร่วม', onClick: () => alert('Joining...') }
                    })
                },
            ]
        },
        {
            title: 'Special Cases',
            icon: Sparkles,
            color: 'text-purple-500',
            tests: [
                {
                    label: 'Multiple Alerts',
                    action: () => {
                        alerts.success('งาน 1 เสร็จสิ้น', 'ทำ Feature A เสร็จแล้ว', 3000);
                        setTimeout(() => alerts.success('งาน 2 เสร็จสิ้น', 'ทำ Feature B เสร็จแล้ว', 3000), 300);
                        setTimeout(() => alerts.success('งาน 3 เสร็จสิ้น', 'ทำ Feature C เสร็จแล้ว', 3000), 600);
                    }
                },
                {
                    label: 'Long Message',
                    action: () => alerts.info(
                        'การอัปเดตระบบ',
                        'ระบบจะมีการอัปเดตในวันที่ 25 ธันวาคม 2024 เวลา 02:00-04:00 น. ขออภัยในความไม่สะดวก ระหว่างนี้คุณอาจไม่สามารถใช้งานระบบได้ชั่วคราว',
                        0
                    )
                },
                {
                    label: 'No Auto-dismiss',
                    action: () => alerts.warning(
                        'ต้องการยืนยัน',
                        'คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์นี้? การกระทำนี้ไม่สามารถยกเลิกได้',
                        {
                            duration: 0,
                            action: {
                                label: 'ยืนยัน',
                                onClick: () => {
                                    alerts.clearAll();
                                    alerts.success('ลบสำเร็จ', 'โปรเจกต์ถูกลบออกจากระบบแล้ว', 3000);
                                }
                            }
                        }
                    )
                },
                {
                    label: 'Clear All',
                    action: () => alerts.clearAll()
                },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[var(--dark-bg)] text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-3">
                        <Bell className="w-10 h-10 text-[var(--orange)]" />
                        <h1 className="text-4xl font-bold">Alert System Demo</h1>
                    </div>
                    <p className="text-gray-400 text-lg">
                        ทดสอบระบบแจ้งเตือนแบบต่างๆ พร้อม Thai language support
                    </p>
                </div>

                {/* Alert Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {demoAlerts.map((category) => (
                        <Card
                            key={category.title}
                            className="bg-white/5 backdrop-blur border-white/10 p-6 space-y-4"
                        >
                            {/* Category Header */}
                            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                                <category.icon className={`w-6 h-6 ${category.color}`} />
                                <h2 className="text-xl font-semibold">{category.title}</h2>
                            </div>

                            {/* Test Buttons */}
                            <div className="space-y-2">
                                {category.tests.map((test, idx) => (
                                    <Button
                                        key={idx}
                                        onClick={test.action}
                                        variant="outline"
                                        className="w-full justify-start text-left bg-white/5 hover:bg-white/10 border-white/10"
                                    >
                                        <span className="text-gray-300">{test.label}</span>
                                    </Button>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Usage Instructions */}
                <Card className="bg-white/5 backdrop-blur border-white/10 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-[var(--orange)]" />
                        วิธีใช้งาน
                    </h3>
                    <div className="space-y-3 text-gray-300">
                        <p>
                            • คลิกปุ่มต่างๆ เพื่อทดสอบ alert แต่ละประเภท
                        </p>
                        <p>
                            • Alert จะแสดงที่มุมขวาบนของหน้าจอ
                        </p>
                        <p>
                            • Alert ส่วนใหญ่จะหายไปอัตโนมัติ (3-6 วินาที)
                        </p>
                        <p>
                            • สามารถกดปุ่ม X เพื่อปิด alert ได้ทันที
                        </p>
                        <p>
                            • Alert บางประเภทมีปุ่ม Action สำหรับดำเนินการ
                        </p>
                        <p>
                            • ใช้ "Clear All" เพื่อลบ alert ทั้งหมดทีเดียว
                        </p>
                    </div>
                </Card>

                {/* Integration Code */}
                <Card className="bg-white/5 backdrop-blur border-white/10 p-6">
                    <h3 className="text-lg font-semibold mb-4">💻 ตัวอย่างโค้ด</h3>
                    <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm text-gray-300">
{`import { useAlerts } from '@/hooks/useAlerts';

function MyComponent() {
  const alerts = useAlerts();

  // Success alert
  alerts.success('สำเร็จ', 'ข้อความ', 3000);

  // Error alert
  alerts.error('ผิดพลาด', 'ข้อความ', 5000);

  // Warning alert
  alerts.warning('คำเตือน', 'ข้อความ', 6000);

  // Info alert with action
  alerts.info('ข้อมูล', 'ข้อความ', 0, {
    action: {
      label: 'ดำเนินการ',
      onClick: () => console.log('Action clicked')
    }
  });
}`}
                    </pre>
                </Card>
            </div>
        </div>
    );
}
