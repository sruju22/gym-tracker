import React from 'react';
import { useThemeStore } from '../../store/themeStore';

export type LogoVariant = 'full' | 'compact' | 'icon' | 'app-icon';
export type LogoMode = 'auto' | 'dark' | 'light';

export interface GymTrackieLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  variant?: LogoVariant;
  mode?: LogoMode;
  height?: number | string;
  width?: number | string;
  className?: string;
}

export const GymTrackieLogo: React.FC<GymTrackieLogoProps> = ({
  variant = 'compact',
  mode = 'auto',
  height,
  width,
  className = '',
  alt = 'GymTrackie',
  ...rest
}) => {
  const { resolvedTheme } = useThemeStore();
  const effectiveTheme = mode === 'auto' ? resolvedTheme : mode;
  const isLight = effectiveTheme === 'light';

  let src: string;

  switch (variant) {
    case 'full':
      src = isLight ? '/gymtrackie-logo-light.svg' : '/gymtrackie-logo-dark.svg';
      break;
    case 'compact':
      src = isLight ? '/gymtrackie-logo-compact-light.svg' : '/gymtrackie-logo-compact.svg';
      break;
    case 'icon':
      src = '/gymtrackie-icon.svg';
      break;
    case 'app-icon':
      src = '/gymtrackie-app-icon.svg';
      break;
    default:
      src = '/gymtrackie-logo-compact.svg';
  }

  // Sensible default heights per variant if neither width nor height is provided
  const defaultHeight =
    height !== undefined
      ? height
      : width !== undefined
      ? undefined
      : variant === 'full'
      ? 36
      : variant === 'compact'
      ? 30
      : variant === 'app-icon'
      ? 36
      : 28;

  return (
    <img
      src={src}
      alt={alt}
      height={defaultHeight}
      width={width}
      style={{
        height: typeof defaultHeight === 'number' ? `${defaultHeight}px` : defaultHeight,
        width: typeof width === 'number' ? `${width}px` : width,
        objectFit: 'contain',
        display: 'inline-block',
      }}
      className={`select-none transition-opacity duration-150 ${className}`}
      loading="eager"
      decoding="async"
      {...rest}
    />
  );
};
