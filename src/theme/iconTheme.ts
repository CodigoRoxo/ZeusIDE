import { createContext, useContext } from 'react';
import materialIcons from 'virtual:material-icons';
import { detectLanguage } from './monacoTheme';

export type IconThemeId = 'zeus' | 'material';

export const ICON_THEMES: { id: IconThemeId; label: string }[] = [
  { id: 'zeus', label: 'Zeus' },
  { id: 'material', label: 'Material' },
];

export const ICON_THEME_KEY = 'zeus_icon_theme';

export const loadIconTheme = (): IconThemeId => {
  try {
    return localStorage.getItem(ICON_THEME_KEY) === 'material' ? 'material' : 'zeus';
  } catch {
    return 'zeus';
  }
};

interface IconThemeContextValue {
  iconTheme: IconThemeId;
  /** Some Material icons have variants that read better on light backgrounds */
  uiTheme: 'dark' | 'light';
}

export const IconThemeContext = createContext<IconThemeContextValue>({ iconTheme: 'zeus', uiTheme: 'dark' });

export const useIconTheme = () => useContext(IconThemeContext);

/**
 * Resolves the Material icon for a file or folder the same way VS Code does:
 * exact file name, then the longest matching extension ("test.tsx" before "tsx"),
 * then the language, then the generic icon.
 */
export function materialIconUrl(name: string, isDirectory: boolean, isOpen: boolean, uiTheme: 'dark' | 'light'): string {
  const lower = name.toLowerCase();
  const light = uiTheme === 'light' ? materialIcons.light : null;
  const pick = (key: keyof typeof materialIcons.light, value: string) =>
    light?.[key][value] ?? materialIcons[key][value];

  let icon: string | undefined;
  if (isDirectory) {
    icon = isOpen ? pick('folderNamesExpanded', lower) : pick('folderNames', lower);
    icon ??= isOpen ? materialIcons.folderExpanded : materialIcons.folder;
  } else {
    icon = pick('fileNames', lower);
    for (let dot = lower.indexOf('.'); !icon && dot !== -1; dot = lower.indexOf('.', dot + 1)) {
      icon = pick('fileExtensions', lower.slice(dot + 1));
    }
    icon ??= pick('languageIds', detectLanguage(name));
    icon ??= materialIcons.file;
  }

  return `./material-icons/${icon}.svg`;
}
