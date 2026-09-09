// Public surface of the Auth module.
export { AuthLayout } from './components/AuthLayout';
export type { AuthBadge } from './components/AuthLayout';
export { LoginForm } from './components/LoginForm';
export { useLogin, useRegister, useMe, useChangePassword, primaryMembership } from './api/auth';
export type {
  LoginCredentials,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  CurrentUser,
  MembershipSummary,
  ChangePasswordRequest,
} from './api/auth';
