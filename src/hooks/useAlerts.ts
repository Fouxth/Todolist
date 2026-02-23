import { useState, useCallback } from 'react';
import type { Alert, AlertType } from '@/components/notifications/AlertSystem';

export function useAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);

    const addAlert = useCallback((
        type: AlertType,
        title: string,
        message: string,
        options?: {
            duration?: number;
            action?: { label: string; onClick: () => void };
        }
    ) => {
        const id = `alert-${Date.now()}-${Math.random()}`;
        const alert: Alert = {
            id,
            type,
            title,
            message,
            duration: options?.duration ?? 5000,
            action: options?.action
        };

        setAlerts(prev => [...prev, alert]);

        return id;
    }, []);

    const success = useCallback((
        title: string,
        message: string,
        durationOrOptions?: number | { duration?: number; action?: { label: string; onClick: () => void } }
    ) => {
        const options = typeof durationOrOptions === 'number'
            ? { duration: durationOrOptions }
            : durationOrOptions;
        return addAlert('success', title, message, options);
    }, [addAlert]);

    const error = useCallback((
        title: string,
        message: string,
        durationOrOptions?: number | { duration?: number; action?: { label: string; onClick: () => void } }
    ) => {
        const options = typeof durationOrOptions === 'number'
            ? { duration: durationOrOptions }
            : durationOrOptions;
        return addAlert('error', title, message, options);
    }, [addAlert]);

    const warning = useCallback((
        title: string,
        message: string,
        durationOrOptions?: number | { duration?: number; action?: { label: string; onClick: () => void } }
    ) => {
        const options = typeof durationOrOptions === 'number'
            ? { duration: durationOrOptions }
            : durationOrOptions;
        return addAlert('warning', title, message, options);
    }, [addAlert]);

    const info = useCallback((
        title: string,
        message: string,
        durationOrOptions?: number | { duration?: number; action?: { label: string; onClick: () => void } }
    ) => {
        const options = typeof durationOrOptions === 'number'
            ? { duration: durationOrOptions }
            : durationOrOptions;
        return addAlert('info', title, message, options);
    }, [addAlert]);

    const dismissAlert = useCallback((id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setAlerts([]);
    }, []);

    return {
        alerts,
        addAlert,
        success,
        error,
        warning,
        info,
        dismissAlert,
        clearAll
    };
}
