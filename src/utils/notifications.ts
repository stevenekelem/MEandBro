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
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
      console.log(`Cancelled ${pending.notifications.length} pending notifications.`);
    }
  } catch (err) {
    console.error('Error cancelling local notifications:', err);
  }
};

/**
 * Schedules all three daily reminders (morning, midday, evening) based on user configuration.
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

  try {
    const parseTime = (timeStr: string) => {
      const [hour, minute] = timeStr.split(':').map(Number);
      return { hour: hour ?? 9, minute: minute ?? 0 };
    };

    const morningTime = parseTime(times.morning);
    const middayTime = parseTime(times.midday);
    const eveningTime = parseTime(times.evening);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1,
          title: "Noticias de la Mañana 🌅",
          body: "Start your morning by checking today's top stories in Spanish!",
          extra: { tab: 'news' },
          schedule: {
            on: morningTime,
            every: 'day',
            allowWhileIdle: true
          }
        },
        {
          id: 2,
          title: "Lección del Mediodía 💬",
          body: "Time for a quick midday drill! Practise chatting with your AI Tutor.",
          extra: { tab: 'chat' },
          schedule: {
            on: middayTime,
            every: 'day',
            allowWhileIdle: true
          }
        },
        {
          id: 3,
          title: "Lectura de la Noche 📖",
          body: "Wind down tonight with an interesting short story in Spanish.",
          extra: { tab: 'literature' },
          schedule: {
            on: eveningTime,
            every: 'day',
            allowWhileIdle: true
          }
        }
      ]
    });
    console.log('Scheduled 3 daily reminders successfully:', times);
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
