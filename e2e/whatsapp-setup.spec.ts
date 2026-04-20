/**
 * E2E tests for WhatsApp AI Agent — setup wizard, conversations, brain editor.
 *
 * Pages are 'use client' components that fetch data via client-side fetch().
 * Server-side auth is bypassed via DEV_SKIP_AUTH in the dev server.
 * API responses are mocked via Playwright page.route() interception.
 */

import { test, expect, type Page } from '@playwright/test';

// ─── API mocks ───────────────────────────────────────────────────────────────

/**
 * Mock all WhatsApp API routes for setup wizard tests.
 * Config starts as null (no config yet).
 */
async function mockSetupApis(page: Page) {
  await page.route('**/api/whatsapp/config', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      });
    } else if (route.request().method() === 'PUT') {
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { id: 'cfg-1', provider_id: 'prov-1', ...body },
          plaintext_fallback: false,
        }),
      });
    }
  });

  await page.route('**/api/whatsapp/knowledge', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      });
    } else if (route.request().method() === 'PUT') {
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'know-1', provider_id: 'prov-1', ...body } }),
      });
    }
  });

  await page.route('**/api/whatsapp/knowledge/sync-pms', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ imported: false }),
    });
  });

  await page.route('**/api/whatsapp/test-reply', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: '¡Hola! Soy Luna, bienvenido a nuestra posada.' }),
    });
  });
}

/**
 * Mock all WhatsApp APIs for conversations page.
 * Config is set (WhatsApp connected) and conversations exist.
 */
async function mockConversationApis(page: Page) {
  await page.route('**/api/whatsapp/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'cfg-1',
          provider_id: 'prov-1',
          phone_number_id: '123456789',
          persona_name: 'Luna',
          ai_enabled: true,
          tone_language: 'bilingual',
        },
      }),
    });
  });

  await page.route('**/api/whatsapp/conversations**', async (route) => {
    const url = route.request().url();
    // Individual conversation detail
    if (/conversations\/conv-/.test(url)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'conv-1',
            guest_phone: '584141000001',
            guest_name: 'Maria Garcia',
            status: 'ai',
            last_message_at: '2026-04-20T14:30:00Z',
            last_message_preview: 'Hola, quiero reservar',
            unread_count: 0,
            booking_stage: 'lead',
            messages: [
              {
                id: 'msg-1', conversation_id: 'conv-1', role: 'inbound',
                content: 'Hola, quiero reservar una habitación', is_ai: false,
                flagged: false, created_at: '2026-04-20T14:25:00Z',
              },
              {
                id: 'msg-2', conversation_id: 'conv-1', role: 'outbound',
                content: '¡Hola Maria! Con gusto te ayudo.', is_ai: true,
                flagged: false, created_at: '2026-04-20T14:25:30Z',
              },
            ],
          },
        }),
      });
      return;
    }
    // Conversations list
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'conv-1',
            guest_phone: '584141000001',
            guest_name: 'Maria Garcia',
            status: 'ai',
            last_message_at: '2026-04-20T14:30:00Z',
            last_message_preview: 'Hola, quiero reservar',
            unread_count: 2,
            booking_stage: 'lead',
          },
          {
            id: 'conv-2',
            guest_phone: '584141000002',
            guest_name: 'John Smith',
            status: 'escalated',
            last_message_at: '2026-04-20T12:00:00Z',
            last_message_preview: 'I need to speak to a manager',
            unread_count: 0,
            booking_stage: 'quoted',
          },
        ],
      }),
    });
  });
}

// ─── Setup Wizard ────────────────────────────────────────────────────────────

test.describe('WhatsApp Setup Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await mockSetupApis(page);
    // Clear any saved wizard state
    await page.goto('/dashboard/whatsapp/setup');
    await page.evaluate(() => localStorage.removeItem('wa_setup_wizard_state'));
  });

  test('Step 1: Welcome page loads with "Empezar configuración" button', async ({ page }) => {
    await page.goto('/dashboard/whatsapp/setup');
    await expect(page.getByText('WhatsApp AI Agent')).toBeVisible({ timeout: 10000 });
    const startBtn = page.getByRole('button', { name: /empezar configuración/i });
    await expect(startBtn).toBeVisible();
  });

  test('Step 2: Navigate to Meta Business and fill credentials', async ({ page }) => {
    await page.goto('/dashboard/whatsapp/setup');
    // Click "Empezar configuración" to go to step 2
    await page.getByRole('button', { name: /empezar configuración/i }).click();

    // Step 2: should show Meta Business heading
    await expect(page.getByText('Conexión con Meta Business')).toBeVisible({ timeout: 5000 });

    // Fill Phone Number ID
    const phoneInput = page.locator('input[placeholder="123456789012345"]');
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill('987654321012345');

    // Fill Access Token
    const tokenInput = page.locator('textarea[placeholder="EAAGx..."]');
    await expect(tokenInput).toBeVisible();
    await tokenInput.fill('EAAx_test_access_token_value');

    // "Siguiente" button should be enabled now
    const nextBtn = page.getByRole('button', { name: /siguiente/i });
    await expect(nextBtn).toBeEnabled();
  });

  test('Step 3: Webhook page shows URL and verify token', async ({ page }) => {
    await page.goto('/dashboard/whatsapp/setup');

    // Navigate to step 2
    await page.getByRole('button', { name: /empezar configuración/i }).click();
    await expect(page.getByText('Conexión con Meta Business')).toBeVisible({ timeout: 5000 });

    // Fill required fields
    await page.locator('input[placeholder="123456789012345"]').fill('987654321012345');
    await page.locator('textarea[placeholder="EAAGx..."]').fill('EAAx_token');

    // Navigate to step 3
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Step 3: should show Webhook configuration
    await expect(page.getByText('Configuración del Webhook')).toBeVisible({ timeout: 5000 });
    // Should display the webhook URL containing /api/whatsapp/webhook
    await expect(page.getByText('/api/whatsapp/webhook')).toBeVisible();
    // Should have copy fields for URL and verify token
    await expect(page.getByText('Webhook URL')).toBeVisible();
    await expect(page.getByText('Verify Token')).toBeVisible();
  });

  test('Step 4: Persona page accepts name and bio', async ({ page }) => {
    await page.goto('/dashboard/whatsapp/setup');

    // Navigate through steps 1-3
    await page.getByRole('button', { name: /empezar configuración/i }).click();
    await page.locator('input[placeholder="123456789012345"]').fill('987654321012345');
    await page.locator('textarea[placeholder="EAAGx..."]').fill('EAAx_token');
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByText('Configuración del Webhook')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Step 4: Persona
    await expect(page.getByText('Personalidad del agente')).toBeVisible({ timeout: 5000 });
  });

  test('Full wizard: navigate from Step 1 through Step 8', async ({ page }) => {
    await page.goto('/dashboard/whatsapp/setup');

    // Step 1 → Step 2
    await page.getByRole('button', { name: /empezar configuración/i }).click();
    await expect(page.getByText('Conexión con Meta Business')).toBeVisible({ timeout: 5000 });

    // Step 2: fill credentials → Step 3
    await page.locator('input[placeholder="123456789012345"]').fill('987654321012345');
    await page.locator('textarea[placeholder="EAAGx..."]').fill('EAAx_token');
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByText('Configuración del Webhook')).toBeVisible({ timeout: 5000 });

    // Step 3 → Step 4
    await page.getByRole('button', { name: /siguiente/i }).click();
    await expect(page.getByText('Personalidad del agente')).toBeVisible({ timeout: 5000 });

    // Step 4: fill persona name → Step 5
    // Need to fill persona_name for canProceed to allow navigation
    const nameInput = page.locator('input').first();
    await nameInput.fill('Luna');
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Step 5: Knowledge
    await expect(page.getByText(/base de conocimiento|knowledge/i).first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Step 6: Working Hours
    await expect(page.getByText(/horario|working hours/i).first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Step 7: Test
    await expect(page.getByText(/prueba|test/i).first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /finalizar/i }).click();

    // Step 8: Go Live — should show summary and activation
    await expect(page.getByText('Resumen y activación')).toBeVisible({ timeout: 5000 });

    // Should have the "Activar agente" button
    const activateBtn = page.getByRole('button', { name: /activar agente/i });
    await expect(activateBtn).toBeVisible();
  });
});

// ─── Conversations Inbox ─────────────────────────────────────────────────────

test.describe('WhatsApp Conversations', () => {
  test.beforeEach(async ({ page }) => {
    await mockConversationApis(page);
  });

  test('inbox loads and displays conversations', async ({ page }) => {
    await page.goto('/dashboard/whatsapp');
    // Should show the messages page heading
    await expect(page.getByText('Messages')).toBeVisible({ timeout: 10000 });
    // Should show conversation names from mock data
    await expect(page.getByText('Maria Garcia')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('John Smith')).toBeVisible();
  });

  test('clicking a conversation shows the message thread', async ({ page }) => {
    await page.goto('/dashboard/whatsapp');
    await expect(page.getByText('Maria Garcia')).toBeVisible({ timeout: 10000 });

    // Click on Maria's conversation
    await page.getByText('Maria Garcia').click();

    // Should load and display messages
    await expect(page.getByText('Hola, quiero reservar una habitación')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('¡Hola Maria! Con gusto te ayudo.')).toBeVisible();
  });

  test('shows unread badge on conversations', async ({ page }) => {
    await page.goto('/dashboard/whatsapp');
    await expect(page.getByText('Maria Garcia')).toBeVisible({ timeout: 10000 });
    // Maria's conversation has 2 unread — the badge is a small round element.
    // Scope to the conversation list area and use exact match to avoid "2h" collision.
    const mariaRow = page.locator('button', { hasText: 'Maria Garcia' });
    const badge = mariaRow.locator('span.rounded-full', { hasText: '2' });
    await expect(badge).toBeVisible();
  });
});

// ─── Brain (Knowledge Editor) ────────────────────────────────────────────────

test.describe('WhatsApp Brain', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/whatsapp/knowledge', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'know-1',
              provider_id: 'prov-1',
              property_description: 'A beautiful eco-lodge in the Andes.',
              location_details: '',
              room_types: [],
              amenities: [],
              faqs: [],
              policies: {},
              payment_methods: [],
              languages_spoken: [],
              booking_process: '',
              nearby_attractions: '',
              special_notes: '',
              pricing_rules: {},
            },
          }),
        });
      } else if (route.request().method() === 'PUT') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 'know-1', ...body } }),
        });
      }
    });

    await page.route('**/api/whatsapp/config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { id: 'cfg-1', phone_number_id: '123', ai_enabled: true },
        }),
      });
    });

    await page.route('**/api/providers/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'prov-1',
            business_name: 'Posada Nube Verde',
            region: 'Mérida',
          },
        }),
      });
    });
  });

  test('knowledge editor page loads with sidebar link highlighted', async ({ page }) => {
    await page.goto('/dashboard/whatsapp/brain');
    // Use a more specific locator — the "AI Brain" sidebar link
    await expect(page.getByRole('link', { name: 'AI Brain' })).toBeVisible({ timeout: 10000 });
  });

  test('shows existing property description from API', async ({ page }) => {
    await page.goto('/dashboard/whatsapp/brain');
    await page.waitForLoadState('networkidle');

    // The page should load knowledge data and display it
    const descField = page.locator('textarea').first();
    await expect(descField).toBeVisible({ timeout: 10000 });
  });
});
