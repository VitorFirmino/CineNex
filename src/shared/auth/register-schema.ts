import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido').min(1, 'E-mail é obrigatório'),
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Deve conter pelo menos um caractere especial'),
  confirmPassword: z.string().min(1, 'Confirme sua senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;
