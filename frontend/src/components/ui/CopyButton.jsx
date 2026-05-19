import { useState } from 'react';
import Button from './Button';

export default function CopyButton({
  text,
  label = 'Копирай линк',
  copiedLabel = 'Копирано',
  disabled = false,
  onCopied,
  onUnavailable,
  size = 'sm',
  variant = 'secondary',
}) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    if (!text || disabled) {
      return;
    }

    if (!navigator?.clipboard?.writeText) {
      onUnavailable?.();
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      onCopied?.();

      window.setTimeout(() => {
        setIsCopied(false);
      }, 1400);
    } catch (_error) {
      onUnavailable?.();
    }
  }

  return (
    <Button size={size} variant={variant} disabled={disabled || !text} onClick={handleCopy}>
      {isCopied ? copiedLabel : label}
    </Button>
  );
}
