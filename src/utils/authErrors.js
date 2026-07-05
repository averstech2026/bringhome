export function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/configuration-not-found':
      return 'В Firebase не включён вход по Email/Password. Откройте Firebase Console → Authentication → Sign-in method → Email/Password → Enable → Save.';
    case 'auth/invalid-credential':
      return 'Неверный email или пароль';
    case 'auth/email-already-in-use':
      return 'Этот email уже занят';
    case 'auth/weak-password':
      return 'Пароль слишком простой (минимум 6 символов)';
    case 'auth/invalid-email':
      return 'Некорректный email';
    default:
      return error?.message || 'Неизвестная ошибка';
  }
}
