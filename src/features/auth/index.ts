// Public surface of the Auth module.
export { AuthLayout } from './components/AuthLayout';
export { LoginForm } from './components/LoginForm';
export { SignUpForm } from './components/SignUpForm';
export { requireUser, requireCommunity, requireNoCommunity, redirectIfSignedIn } from './guards';
export { ForgotPasswordForm } from './components/ForgotPasswordForm';
export { ResetPasswordForm } from './components/ResetPasswordForm';
export {
  useLogin,
  useRegister,
  useSignUp,
  useMe,
  useChangePassword,
  primaryMembership,
  hasCommunity,
  meQueryOptions,
  ExistingAccountError,
} from './api/auth';
export { useRequestPasswordReset, useConfirmPasswordReset } from './api/password-reset';
export { useWorkspace, selectCommunity } from './api/workspace';
export type { Workspace } from './api/workspace';
export type {
  PositionSummary,
  LoginCredentials,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  CurrentUser,
  MembershipSummary,
  ChangePasswordRequest,
} from './api/auth';
