import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
    id: string;
    type: AlertType;
    title: string;
    message: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface AlertSystemProps {
    alerts: Alert[];
    onDismiss: (id: string) => void;
}

const ALERT_CONFIG: Record<AlertType, {
    icon: typeof CheckCircle;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    textColor: string;
}> = {
    success: {
        icon: CheckCircle,
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        iconColor: 'text-green-400',
        textColor: 'text-green-300'
    },
    error: {
        icon: XCircle,
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        iconColor: 'text-red-400',
        textColor: 'text-red-300'
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        iconColor: 'text-orange-400',
        textColor: 'text-orange-300'
    },
    info: {
        icon: Info,
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400',
        textColor: 'text-blue-300'
    }
};

export function AlertSystem({ alerts, onDismiss }: AlertSystemProps) {
    return (
        <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            {alerts.map(alert => (
                <AlertItem
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => onDismiss(alert.id)}
                />
            ))}
        </div>
    );
}

function AlertItem({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
    const [isExiting, setIsExiting] = useState(false);
    const config = ALERT_CONFIG[alert.type];
    const Icon = config.icon;

    useEffect(() => {
        if (alert.duration) {
            const timer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(onDismiss, 300);
            }, alert.duration);
            return () => clearTimeout(timer);
        }
    }, [alert.duration, onDismiss]);

    return (
        <div
            className={cn(
                "pointer-events-auto w-[400px] p-4 rounded-xl border-2 backdrop-blur-xl shadow-2xl",
                "transition-all duration-300",
                config.bgColor,
                config.borderColor,
                isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0 animate-in slide-in-from-right"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn("shrink-0 mt-0.5", config.iconColor)}>
                    <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className={cn("font-semibold text-sm mb-1", config.textColor)}>
                        {alert.title}
                    </h4>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        {alert.message}
                    </p>

                    {/* Action */}
                    {alert.action && (
                        <button
                            onClick={alert.action.onClick}
                            className={cn(
                                "mt-3 px-3 py-1.5 rounded-lg text-xs font-medium",
                                "transition-colors",
                                config.bgColor,
                                config.textColor,
                                "hover:brightness-110"
                            )}
                        >
                            {alert.action.label}
                        </button>
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={() => {
                        setIsExiting(true);
                        setTimeout(onDismiss, 300);
                    }}
                    className="shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Progress Bar */}
            {alert.duration && (
                <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full", config.iconColor.replace('text-', 'bg-'))}
                        style={{
                            animation: `progress ${alert.duration}ms linear`
                        }}
                    />
                </div>
            )}
        </div>
    );
}

// CSS Animation
const style = document.createElement('style');
style.textContent = `
  @keyframes progress {
    from { width: 100%; }
    to { width: 0%; }
  }
`;
document.head.appendChild(style);
