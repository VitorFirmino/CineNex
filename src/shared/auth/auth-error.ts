import type { AuthContext } from "@shared/auth/types";

const AUTH_ERROR_MAP: Array<[string, string]> = [
  ["invalid login credentials", "Credenciais inválidas. Verifique e-mail e senha."],
  ["muitas tentativas em pouco tempo", "Muitas tentativas em pouco tempo. Aguarde e tente novamente."],
  ["limite de envio de e-mails atingido", "Limite de envio de e-mails atingido. Aguarde alguns minutos e tente novamente."],
  ["email not confirmed", "Conta ainda não confirmada. Use o código enviado por e-mail."],
  ["user already registered", "Este e-mail já está cadastrado. Faça login ou recupere sua senha."],
  ["email rate limit exceeded", "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."],
  ["too many requests", "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente."],
  ["network request failed", "Falha de conexão. Verifique sua internet e tente novamente."],
  ["auth session missing", "Sessão expirada para redefinir senha. Solicite um novo link de recuperação."],
  ["new password should be different", "A nova senha deve ser diferente da senha atual."],
  ["password should be", "A senha não atende aos requisitos mínimos de segurança."],
  ["token has expired or is invalid", "Código inválido ou expirado. Solicite um novo código e tente novamente."],
  ["invalid token", "Código inválido ou expirado. Solicite um novo código e tente novamente."],
  ["otp", "Código inválido ou expirado. Solicite um novo código e tente novamente."],
];

const CONTEXT_FALLBACK_MESSAGES: Record<AuthContext, string> = {
  login: "Não foi possível entrar agora. Tente novamente.",
  register: "Não foi possível criar sua conta agora. Tente novamente.",
  reset: "Não foi possível redefinir sua senha agora. Tente novamente.",
  verify: "Não foi possível validar o código agora. Tente novamente.",
};

export function translateAuthError(
  rawMessage: string,
  context: AuthContext,
): string {
  const message = rawMessage.toLowerCase();

  const match = AUTH_ERROR_MAP.find(([key]) => message.includes(key));
  if (match) {
    const [key, translation] = match;
    const isPassthrough = ["muitas tentativas em pouco tempo", "limite de envio de e-mails atingido"].includes(key);
    return isPassthrough ? (rawMessage || translation) : translation;
  }

  return CONTEXT_FALLBACK_MESSAGES[context];
}
