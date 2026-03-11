import { expect, test, type Page } from "@playwright/test";

async function submitOtp(page: Page, code: string) {
  await expect(page.locator("input[name='email']")).toHaveValue(/.+@.+/, {
    timeout: 15_000,
  });
  await page.locator("input[name='token']").evaluate((input, value) => {
    if (!(input instanceof HTMLInputElement) || typeof value !== "string") return;
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, code);
  await expect(page.locator("input[name='token']")).toHaveValue(code, {
    timeout: 15_000,
  });
}

test.describe("auth flow", () => {
  test("should show the invalid credentials message in portuguese", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid login credentials",
        }),
      });
    });

    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill("naoexiste@example.com");
    await page.getByPlaceholder("••••••••").fill("Senha@123");
    await page.getByRole("button", { name: "Fazer login" }).click();

    await expect(
      page.getByText("Credenciais inválidas. Verifique e-mail e senha."),
    ).toBeVisible();
  });

  test("should display the query message and clean the url", async ({ page }) => {
    await page.goto("/login?message=Cadastro%20criado%20com%20sucesso");

    await expect(page.getByText("Cadastro criado com sucesso")).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("message"))
      .toBeNull();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("should offer navigation to forgot password from login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Recuperar Senha" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show the google login entry point", async ({ page }) => {
    await page.goto("/login?next=%2Fcollection%2Ffavorites");

    await expect(
      page.getByRole("button", { name: "Continuar com Google" }),
    ).toBeVisible();
  });

  test("should complete register, otp, resend, login and forgot-password with mocked api responses", async ({
    page,
  }) => {
    const testEmail = "qa.flow@example.com";
    let verifyAttempts = 0;

    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          sessionCreated: false,
          message:
            "Se o e-mail estiver disponível para cadastro, enviaremos um código de confirmação.",
        }),
      });
    });

    await page.route("**/api/auth/verify-otp", async (route) => {
      verifyAttempts += 1;
      const payload = route.request().postDataJSON() as { token?: string };
      const token = String(payload?.token || "");

      if (token === "111111") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            errorCode: "invalid_or_expired_otp",
            message:
              "Código inválido ou expirado. Solicite um novo código e tente novamente.",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route("**/api/auth/resend", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message:
            "Se o e-mail estiver cadastrado e pendente de confirmação, enviaremos um novo código.",
        }),
      });
    });

    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message:
            "Se o e-mail estiver cadastrado, enviaremos o link de recuperação.",
        }),
      });
    });

    await page.goto("/register");
    await page.getByRole("textbox", { name: "Nome Completo" }).fill("QA Flow");
    await page.getByRole("textbox", { name: "E-mail" }).fill(testEmail);
    await page
      .getByRole("textbox", { name: "Senha", exact: true })
      .fill("Senha@123A");
    await page
      .getByRole("textbox", { name: "Confirmar Senha" })
      .fill("Senha@123A");
    await page.getByRole("button", { name: "Criar Minha Conta" }).click();

    await expect(page).toHaveURL(/\/verify-otp\?email=/, { timeout: 15_000 });

    const firstVerifyAttempt = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/auth/verify-otp") &&
        response.request().method() === "POST"
      );
    });
    await submitOtp(page, "111111");
    await firstVerifyAttempt;
    await expect
      .poll(() => verifyAttempts, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(1);
    await expect(page).toHaveURL(/\/verify-otp/, { timeout: 15_000 });

    await page.getByRole("button", { name: "Reenviar código" }).click();
    await expect(
      page.getByText(
        "Se o e-mail estiver cadastrado e pendente de confirmação, enviaremos um novo código.",
      ),
    ).toBeVisible();

    const secondVerifyAttempt = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/auth/verify-otp") &&
        response.request().method() === "POST"
      );
    });
    await submitOtp(page, "123456");
    await secondVerifyAttempt;
    await expect
      .poll(() => verifyAttempts, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(2);
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

    await page.goto("/login");
    await page.getByPlaceholder("seu@email.com").fill(testEmail);
    await page.getByPlaceholder("••••••••").fill("Senha@123A");
    await page.getByRole("button", { name: "Fazer login" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/forgot-password");
    await page.getByPlaceholder("seu@email.com").fill(testEmail);
    await page
      .getByRole("button", { name: "Enviar link de recuperação" })
      .click();
    await expect(
      page.getByText(
        /Se o e-mail estiver cadastrado, enviaremos o link de recuperação\./,
      ),
    ).toBeVisible();
  });

  test("should accept the email from query params and validate otp length", async ({
    page,
  }) => {
    await page.goto("/verify-otp?email=teste%40email.com");

    await expect(page.locator("input[name='email']")).toHaveValue(
      "teste@email.com",
    );
    await page.getByLabel("Dígito 1 do código").fill("123");
    await page.getByRole("button", { name: "Validar código" }).click();

    await expect(
      page.getByText("Digite o código com 6 a 8 dígitos"),
    ).toBeVisible();
  });

  test("should validate password confirmation on reset-password", async ({ page }) => {
    await page.goto("/reset-password");

    await page.locator("input[name='password']").fill("Senha@123");
    await page.locator("input[name='confirmPassword']").fill("Senha@124");
    await page.getByRole("button", { name: "Atualizar senha" }).click();

    await expect(page.getByText("As senhas não coincidem")).toBeVisible();
  });

  test("should create a recovery session and redirect to reset-password for a valid recovery hash", async ({
    page,
  }) => {
    let capturedBody: { accessToken?: string; refreshToken?: string } | null = null;

    await page.route("**/api/auth/recovery/session", async (route) => {
      const body = route.request().postDataJSON() as {
        accessToken?: string;
        refreshToken?: string;
      };
      capturedBody = body;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(
      "/login#type=recovery&access_token=atk_test_recovery&refresh_token=rtk_test_recovery",
    );

    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(page.getByRole("heading", { name: "Nova Senha" })).toBeVisible();
    expect(capturedBody).toEqual({
      accessToken: "atk_test_recovery",
      refreshToken: "rtk_test_recovery",
    });
    expect(page.url()).not.toContain("#");
  });

  test("should redirect to forgot-password with a safe message for an invalid recovery hash", async ({
    page,
  }) => {
    await page.route("**/api/auth/recovery/session", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error:
            "Sessão de recuperação inválida ou expirada. Solicite um novo e-mail.",
        }),
      });
    });

    await page.goto(
      "/login#type=recovery&access_token=invalid_access&refresh_token=invalid_refresh",
    );

    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(
      page.getByText(
        "Não foi possível validar o link de recuperação. Solicite um novo e-mail.",
      ),
    ).toBeVisible();
    expect(page.url()).not.toContain("#");
  });

  test("should redirect expired recovery hashes to forgot-password", async ({ page }) => {
    await page.goto(
      "/login#error_code=otp_expired&error=access_denied&error_description=Email%20link%20is%20invalid%20or%20has%20expired",
    );

    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(
      page.getByText(
        "O link de recuperação expirou ou já foi utilizado. Solicite um novo e-mail de recuperação.",
      ),
    ).toBeVisible();
    expect(page.url()).not.toContain("#");
  });
});
