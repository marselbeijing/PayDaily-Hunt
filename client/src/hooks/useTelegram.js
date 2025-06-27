import { useEffect, useState } from 'react';

export function useTelegram() {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(null);
  const [queryId, setQueryId] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const webApp = window.Telegram.WebApp;
      setTg(webApp);
      setUser(webApp.initDataUnsafe?.user || null);
      setQueryId(webApp.initDataUnsafe?.query_id || null);
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
    if (tg?.MainButton) {
      tg.MainButton.setText(text);
      tg.MainButton.show();
      if (onClick) tg.MainButton.onClick(onClick);
    }
  };

  const hideMainButton = () => tg?.MainButton?.hide && tg.MainButton.hide();

  const showAlert = (msg) => tg?.showAlert && tg.showAlert(msg);

  const showConfirm = (message, callback) => {
    tg?.showConfirm(message, callback);
  };

  const hapticFeedback = (type, intensity) => tg?.HapticFeedback?.impactOccurred && tg.HapticFeedback.impactOccurred(type, intensity);

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
    user,
    queryId,
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