import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Requests notification permission on native Android device.
 * Returns true if granted, false otherwise.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Notification permission check: Not on a native platform.');
    return false;
  }
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') {
      return true;
    }
    const request = await LocalNotifications.requestPermissions();
    return request.display === 'granted';
  } catch (err) {
    console.error('Error requesting local notification permission:', err);
    return false;
  }
};

/**
 * Cancels all currently scheduled local notifications.
 */
export const cancelAllReminders = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications && pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
      console.log(`Cancelled ${pending.notifications.length} pending notifications.`);
    }
  } catch (err) {
    console.error('Error cancelling local notifications:', err);
  }
};

/**
 * Ensures high-priority notification channel exists on Android.
 */
const ensureNotificationChannel = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: 'spanglish_reminders',
      name: 'Spanglish Learning Reminders',
      description: 'Daily learning reminders for news, lessons, and literature',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  } catch (err) {
    console.warn('Notification channel setup log:', err);
  }
};

/**
 * Schedules individual explicit future reminders for the next 14 days.
 * This guarantees no past dates fire immediately on app open, and ensures
 * exact timing on Android devices across all OS power profiles.
 */
export const scheduleAllReminders = async (
  enabled: boolean,
  times: { morning: string; midday: string; evening: string }
) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Skipped scheduling notifications: Not running on a native platform.');
    return;
  }

  // Always cancel any existing scheduled notifications first
  await cancelAllReminders();

  if (!enabled) {
    console.log('Daily reminders are disabled by user configuration.');
    return;
  }

  // Ensure permission is granted
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('Cannot schedule notifications: Permission not granted.');
    return;
  }

  await ensureNotificationChannel();

  try {
    const parseTime = (timeStr: string) => {
      const [hour, minute] = (timeStr || '09:00').split(':').map(Number);
      return { hour: hour ?? 9, minute: minute ?? 0 };
    };

    const morningTime = parseTime(times.morning);
    const middayTime = parseTime(times.midday);
    const eveningTime = parseTime(times.evening);

    const now = Date.now();
    const DAYS_TO_SCHEDULE = 14;
    const notificationsToSchedule: any[] = [];

    const getTargetDate = (hour: number, minute: number, dayOffset: number): Date | null => {
      const target = new Date();
      target.setDate(target.getDate() + dayOffset);
      target.setHours(hour, minute, 0, 0);

      // If scheduled time is in the past or within 5 seconds from now, skip it so it NEVER fires immediately!
      if (target.getTime() <= now + 5000) {
        return null;
      }
      return target;
    };

    for (let d = 0; d < DAYS_TO_SCHEDULE; d++) {
      // 1. Morning News
      const morningDate = getTargetDate(morningTime.hour, morningTime.minute, d);
      if (morningDate) {
        notificationsToSchedule.push({
          id: 1000 + d,
          title: "Noticias de la Mañana 🌅",
          body: "Start your morning by checking today's top stories in Spanish!",
          extra: { tab: 'news' },
          channelId: 'spanglish_reminders',
          schedule: {
            at: morningDate,
            allowWhileIdle: true
          }
        });
      }

      // 2. Midday Lesson
      const middayDate = getTargetDate(middayTime.hour, middayTime.minute, d);
      if (middayDate) {
        notificationsToSchedule.push({
          id: 2000 + d,
          title: "Lección del Mediodía 💬",
          body: "Time for a quick midday drill! Practise chatting with your AI Tutor.",
          extra: { tab: 'chat' },
          channelId: 'spanglish_reminders',
          schedule: {
            at: middayDate,
            allowWhileIdle: true
          }
        });
      }

      // 3. Evening Literature
      const eveningDate = getTargetDate(eveningTime.hour, eveningTime.minute, d);
      if (eveningDate) {
        notificationsToSchedule.push({
          id: 3000 + d,
          title: "Lectura de la Noche 📖",
          body: "Wind down tonight with an interesting short story in Spanish.",
          extra: { tab: 'literature' },
          channelId: 'spanglish_reminders',
          schedule: {
            at: eveningDate,
            allowWhileIdle: true
          }
        });
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
      console.log(`Successfully scheduled ${notificationsToSchedule.length} explicit future notifications over the next 14 days.`);
    }
  } catch (err) {
    console.error('Failed to schedule local notifications:', err);
  }
};

/**
 * Triggers a test notification after a short delay (3 seconds).
 */
export const sendTestNotification = async (tab: 'news' | 'chat' | 'literature') => {
  if (!Capacitor.isNativePlatform()) {
    alert(`[Mock Push Notification]\nTab: ${tab.toUpperCase()}\nTitle: Reminder Test\nBody: Click to navigate!`);
    return;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('Cannot trigger test notification: Permission not granted.');
    return;
  }

  await ensureNotificationChannel();

  let title = '';
  let body = '';
  let id = 99;

  switch (tab) {
    case 'news':
      title = "Buenos días! 🌅";
      body = "Start your day with today's top stories in Spanish.";
      id = 91;
      break;
    case 'chat':
      title = "Time for a quick chat? 💬";
      body = "Practice speaking Spanish with your AI Tutor.";
      id = 92;
      break;
    case 'literature':
      title = "Evening reading 📖";
      body = "Unwind with a short literature selection.";
      id = 93;
      break;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          extra: { tab },
          channelId: 'spanglish_reminders',
          schedule: {
            at: new Date(Date.now() + 3000), // Fire in 3 seconds
            allowWhileIdle: true
          }
        }
      ]
    });
    console.log(`Scheduled test notification for ${tab} (ID: ${id}) to fire in 3 seconds.`);
  } catch (err) {
    console.error('Failed to schedule test notification:', err);
  }
};
