export const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;

export const AVATAR_FILE_TOO_LARGE_MESSAGE =
  'Ошибка: Файл слишком тяжелый. Максимальный размер аватарки — 2 МБ';

/**
 * @returns {string | null} Сообщение об ошибке или null, если файл подходит.
 */
export function validateAvatarFile(file) {
  if (!file.type.startsWith('image/')) {
    return 'Выберите изображение';
  }

  if (file.size > MAX_AVATAR_FILE_SIZE) {
    return AVATAR_FILE_TOO_LARGE_MESSAGE;
  }

  return null;
}
