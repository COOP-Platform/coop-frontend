// Public surface of the Auth module.
export { AuthLayout } from './components/AuthLayout';
export type { AuthBadge } from './components/AuthLayout';
export { LoginForm } from './components/LoginForm';
export { ForgotPasswordForm } from './components/ForgotPasswordForm';
export { ResetPasswordForm } from './components/ResetPasswordForm';
export { useLogin, useRegister, useMe, useChangePassword, primaryMembership } from './api/auth';
export { useRequestPasswordReset, useConfirmPasswordReset } from './api/password-reset';
export type {
  LoginCredentials,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  CurrentUser,
  MembershipSummary,
  ChangePasswordRequest,
} from './api/auth';
