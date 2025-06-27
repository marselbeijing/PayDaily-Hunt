import { useEffect, useState } from 'react';

const tg = window.Telegram?.WebApp;

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (tg) {
      tg.ready();
      setIsReady(true);
    }
  }, []);

  const onClose = () => {
    tg?.close();
  };

  const onToggleButton = () => {
    if (tg?.MainButton.isVisible) {
      tg.MainButton.hide();
    } else {
      tg.MainButton.show();
    }
  };

  const showMainButton = (text, onClick) => {
    tg?.MainButton.setParams({
      text: text,
      is_active: true,
      is_visible: true
    });
    tg?.MainButton.onClick(onClick);
  };

  const hideMainButton = () => {
    tg?.MainButton.hide();
  };

  const showAlert = (message) => {
    tg?.showAlert(message);
  };

  const showConfirm = (message, callback) => {
    tg?.showConfirm(message, callback);
  };

  const hapticFeedback = (type = 'impact', style = 'medium') => {
    if (tg?.HapticFeedback) {
      if (type === 'impact') {
        tg.HapticFeedback.impactOccurred(style);
      } else if (type === 'notification') {
        tg.HapticFeedback.notificationOccurred(style);
      } else if (type === 'selection') {
        tg.HapticFeedback.selectionChanged();
      }
    }
  };

  const openLink = (url) => {
    tg?.openLink(url);
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    hapticFeedback('notification', 'success');
  };

  const shareUrl = (url, text) => {
    if (tg?.openTelegramLink) {
      const shareText = encodeURIComponent(text || '');
      const shareUrl = encodeURIComponent(url);
      tg.openTelegramLink(`https://t.me/share/url?url=${shareUrl}&text=${shareText}`);
    }
  };

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    queryId: tg?.initDataUnsafe?.query_id,
    colorScheme: tg?.colorScheme,
    themeParams: tg?.themeParams,
    isExpanded: tg?.isExpanded,
    viewportHeight: tg?.viewportHeight,
    viewportStableHeight: tg?.viewportStableHeight,
    version: tg?.version,
    platform: tg?.platform,
    isReady,
    onClose,
    onToggleButton,
    showMainButton,
    hideMainButton,
    showAlert,
    showConfirm,
    hapticFeedback,
    openLink,
    copyToClipboard,
    shareUrl
  };
} 