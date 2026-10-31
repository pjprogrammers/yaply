import { expect, test, type Page } from "@playwright/test";

const SKRIBBL_URL = process.env.E2E_SKRIBBL_URL ?? "http://localhost:3001";
const CHAIN_URL = process.env.E2E_CHAIN_URL ?? "http://localhost:3002";
const CHAIN_COLS = 9;

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function createRoom(page: Page, base: string, nickname: string): Promise<string> {
  await page.goto(base);
  await page.getByPlaceholder("Your name").fill(nickname);
  await page.getByRole("button", { name: "Create a room" }).click();
  await page.waitForURL(/\/room\/[a-z0-9]{6}/, { timeout: 30_000 });
  const code = new URL(page.url()).pathname.split("/").pop()!;
  expect(code).toMatch(/^[a-z0-9]{6}$/);
  return code;
}

async function joinRoom(page: Page, base: string, code: string, nickname: string): Promise<void> {
  await page.goto(`${base}/room/${code}?name=${encodeURIComponent(nickname)}`);
  await expect(page.getByText(nickname, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
}

async function isGameOver(page: Page): Promise<boolean> {
  return page
    .getByText("Game over", { exact: false })
    .first()
    .isVisible()
    .catch(() => false);
}

/**
 * Waits for the next word-choice panel, or reports that the game ended while
 * the previous round was being scored. Word selection alternates between
 * players, so the panel can appear on any page.
 */
async function waitForChoiceOrGameOver(
  pages: Page[],
): Promise<{ page: Page; word: string } | null> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    for (const page of pages) {
      if (await isGameOver(page)) return null;
    }
    for (const page of pages) {
      const panel = page.locator(".choice-panel");
      if (await panel.isVisible().catch(() => false)) {
        const button = panel.locator("button.choice").first();
        if (await button.isVisible().catch(() => false)) {
          const word = (await button.innerText()).trim();
          return { page, word };
        }
      }
    }
    await delay(150);
  }
  throw new Error("No player received word choices in time.");
}

async function waitForChoice(pages: Page[]): Promise<{ page: Page; word: string }> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    for (const page of pages) {
      const panel = page.locator(".choice-panel");
      if (await panel.isVisible().catch(() => false)) {
        const button = panel.locator("button.choice").first();
        if (await button.isVisible().catch(() => false)) {
          return { page, word: (await button.innerText()).trim() };
        }
      }
    }
    await delay(150);
  }
  throw new Error("No player received word choices in time.");
}

async function inkPixels(page: Page): Promise<number> {
  return page.locator("canvas").first().evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (!context) return 0;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let ink = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] < 245 || data[index + 1] < 245 || data[index + 2] < 245) ink += 1;
    }
    return ink;
  });
}

async function playSkribblTurn(
  choice: { page: Page; word: string },
  pages: Page[],
  options: { draw?: boolean; simultaneous?: boolean } = {},
): Promise<void> {
  const { page: drawer, word } = choice;
  const guessers = pages.filter((page) => page !== drawer);
  await drawer.locator(".choice-panel button.choice").first().click();

  await expect(drawer.locator('canvas[aria-label="Drawing canvas"]')).toBeVisible();
  for (const guesser of guessers) {
    await expect(guesser.locator('canvas[aria-label="Drawing by another player"]')).toBeVisible();
    // The secret word must never be rendered for a guesser. `.paper-mask` is a
    // landing-page decoration, so target the real in-room WordMask element.
    await expect(guesser.locator(".choice-panel")).toHaveCount(0);
    await expect(guesser.locator(".drawer-word")).toHaveCount(0);
    const mask = guesser.locator(".word-mask");
    await expect(mask).toBeVisible();
    await expect(mask).toHaveAttribute("aria-label", "Hidden word");
    await expect(mask.locator('[data-revealed="true"]')).toHaveCount(0);
    const masked = (await mask.innerText()).replace(/\s+/g, "").toLowerCase();
    expect(masked).not.toContain(word.replace(/\s+/g, "").toLowerCase());
  }

  if (options.draw !== false) {
    const canvas = drawer.locator('canvas[aria-label="Drawing canvas"]');
    const box = await canvas.boundingBox();
    if (box) {
      await drawer.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
      await drawer.mouse.down();
      await drawer.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.6, { steps: 8 });
      await drawer.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.35, { steps: 8 });
      await drawer.mouse.up();
      await expect
        .poll(() => inkPixels(guessers[0]), { timeout: 10_000 })
        .toBeGreaterThan(0);
    }
  }

  if (options.simultaneous && guessers.length > 1) {
    await Promise.all(
      guessers.map(async (guesser) => {
        await guesser.getByLabel("Chat message").fill(word);
        await guesser.getByLabel("Send message").click();
      }),
    );
  } else {
    for (const guesser of guessers) {
      await guesser.getByLabel("Chat message").fill(word);
      await guesser.getByLabel("Send message").click();
    }
  }

  await expect(drawer.locator(".round-reveal")).toBeVisible({ timeout: 15_000 });
  for (const guesser of guessers) {
    await expect(guesser.locator(".round-reveal")).toBeVisible({ timeout: 15_000 });
  }
}

/** Plays complete turns until the server reports game over. */
async function playSkribblGame(
  pages: Page[],
  options: { maxTurns?: number; drawTurns?: number } = {},
): Promise<number> {
  const maxTurns = options.maxTurns ?? 14;
  const drawTurns = options.drawTurns ?? 1;
  let turns = 0;

  while (turns < maxTurns) {
    const choice = await waitForChoiceOrGameOver(pages);
    if (!choice) return turns;
    await playSkribblTurn(choice, pages, {
      draw: turns < drawTurns,
      simultaneous: pages.length > 2,
    });
    turns += 1;
  }

  throw new Error(`Game did not finish after ${maxTurns} turns.`);
}

async function waitForGameOver(page: Page): Promise<void> {
  await expect(page.getByText("Game over", { exact: false }).first()).toBeVisible({
    timeout: 30_000,
  });
}

function playerScore(page: Page, nickname: string): Promise<number> {
  return page
    .locator(".player", { hasText: nickname })
    .locator(".player-score")
    .first()
    .innerText()
    .then((text) => Number.parseInt(text, 10));
}

async function pageWithChainTurn(pages: Page[]): Promise<Page> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (const page of pages) {
      if (await page.locator('.board[data-my-turn="true"]').count()) return page;
    }
    await delay(100);
  }
  throw new Error("No player received a Chain Reaction turn in time.");
}

async function chainBoardState(page: Page) {
  return page.locator(".board .cell").evaluateAll((cells) =>
    cells.map((cell) => ({
      label: cell.getAttribute("aria-label"),
      owner: cell.getAttribute("data-owner"),
      orbs: cell.querySelector(".cell-orbs")?.getAttribute("data-count"),
    })),
  );
}

async function chainPlace(
  pages: Page[],
  row: number,
  col: number,
  expectedMoves: number,
): Promise<Page> {
  const page = await pageWithChainTurn(pages);
  await page.locator(".board .cell").nth(row * CHAIN_COLS + col).click();
  await expect(page.locator(".chain-head-title")).toContainText(`${expectedMoves} moves`, {
    timeout: 15_000,
  });
  return page;
}

test("Skribbl: two browsers complete a full match with drawing sync, secret-word privacy and rematch", async ({
  browser,
}) => {
  const host = await browser.newPage();
  const guest = await browser.newPage();
  const code = await createRoom(host, SKRIBBL_URL, "Alice");
  await joinRoom(guest, SKRIBBL_URL, code, "Bob");

  await expect(host.getByRole("button", { name: "Start game" })).toBeVisible();
  await host.getByRole("button", { name: "Start game" }).click();

  const pages = [host, guest];
  const turns = await playSkribblGame(pages, { drawTurns: 1 });
  // Default settings are three rounds with two players, so six turns minimum.
  expect(turns).toBeGreaterThanOrEqual(6);

  await waitForGameOver(host);
  await waitForGameOver(guest);

  const hostScore = await playerScore(host, "Alice");
  const guestScore = await playerScore(guest, "Bob");
  expect(hostScore).toBeGreaterThanOrEqual(0);
  expect(guestScore).toBeGreaterThanOrEqual(0);

  // Both clients must agree on the final ranking order.
  const hostRankings = await host.locator(".result-rank-name").allInnerTexts();
  const guestRankings = await guest.locator(".result-rank-name").allInnerTexts();
  expect(hostRankings.length).toBe(2);
  expect(hostRankings.map((name) => name.replace(" (you)", ""))).toEqual(
    guestRankings.map((name) => name.replace(" (you)", "")),
  );

  // Rematch must reset the board and return to word selection.
  await host.getByRole("button", { name: "Rematch" }).click();
  // The old game-over overlay can stay mounted for a frame while the rematch
  // snapshot arrives, so wait for an actual choice panel rather than treating
  // the stale overlay as a second game over.
  const rematch = await waitForChoice(pages);
  expect(rematch.word.length).toBeGreaterThan(0);

  await host.close();
  await guest.close();
});

test("Skribbl: three players see the same round and simultaneous correct guesses both score", async ({
  browser,
}) => {
  const host = await browser.newPage();
  const guestOne = await browser.newPage();
  const guestTwo = await browser.newPage();
  const code = await createRoom(host, SKRIBBL_URL, "Host");
  await joinRoom(guestOne, SKRIBBL_URL, code, "One");
  await joinRoom(guestTwo, SKRIBBL_URL, code, "Two");

  await host.getByRole("button", { name: "Start game" }).click();
  const choice = await waitForChoiceOrGameOver([host, guestOne, guestTwo]);
  expect(choice).not.toBeNull();
  await playSkribblTurn(choice!, [host, guestOne, guestTwo], {
    draw: true,
    simultaneous: true,
  });

  // Both guessers must be marked as correct in the shared scoreboard.
  for (const page of [guestOne, guestTwo]) {
    await expect(page.locator(".player-guessed")).toHaveCount(2);
  }

  await host.close();
  await guestOne.close();
  await guestTwo.close();
});

test("Skribbl: a refreshed player keeps their seat and score and the match still finishes", async ({
  browser,
}) => {
  const host = await browser.newPage();
  const guest = await browser.newPage();
  const code = await createRoom(host, SKRIBBL_URL, "Alice");
  await joinRoom(guest, SKRIBBL_URL, code, "Bob");
  await host.getByRole("button", { name: "Start game" }).click();

  const pages = [host, guest];
  // Play two turns so both players have had a chance to draw or guess.
  for (let turn = 0; turn < 2; turn += 1) {
    const choice = await waitForChoiceOrGameOver(pages);
    expect(choice).not.toBeNull();
    await playSkribblTurn(choice!, pages, { draw: turn === 0 });
  }

  const scoreBefore = await playerScore(guest, "Bob");
  await expect(guest.locator(".player--me")).toContainText("Bob");

  await guest.reload();
  await expect(guest.locator(".player--me")).toContainText("Bob", { timeout: 30_000 });
  await expect(host.locator(".player")).toHaveCount(2);
  await expect(guest.locator(".player")).toHaveCount(2);
  // The resume token restores the same seat instead of creating a duplicate.
  await expect(guest.locator(".player--me")).toHaveCount(1);
  expect(await playerScore(guest, "Bob")).toBe(scoreBefore);

  const remaining = await playSkribblGame(pages, { drawTurns: 0 });
  expect(remaining).toBeGreaterThan(0);
  await waitForGameOver(host);
  await waitForGameOver(guest);

  await host.close();
  await guest.close();
});

test("Skribbl: a drawer who disconnects during drawing ends the round for everyone", async ({
  browser,
}) => {
  const host = await browser.newPage();
  const guestOne = await browser.newPage();
  const guestTwo = await browser.newPage();
  const code = await createRoom(host, SKRIBBL_URL, "Host");
  await joinRoom(guestOne, SKRIBBL_URL, code, "One");
  await joinRoom(guestTwo, SKRIBBL_URL, code, "Two");
  await host.getByRole("button", { name: "Start game" }).click();

  const pages = [host, guestOne, guestTwo];
  const choice = await waitForChoiceOrGameOver(pages);
  expect(choice).not.toBeNull();
  const drawerPage = choice!.page;
  await drawerPage.locator(".choice-panel button.choice").first().click();
  await expect(drawerPage.locator('canvas[aria-label="Drawing canvas"]')).toBeVisible();

  const survivors = pages.filter((page) => page !== drawerPage);
  for (const page of survivors) {
    await expect(page.locator('canvas[aria-label="Drawing by another player"]')).toBeVisible();
  }

  await drawerPage.close();

  // The server gives the drawer a short reconnect grace period, then closes
  // the round with the "drawer left" reason on every remaining client.
  for (const page of survivors) {
    await expect(page.locator(".round-reveal")).toBeVisible({ timeout: 25_000 });
    await expect(page.locator(".round-reveal")).toContainText("the drawer left");
  }

  // The next turn must still start for the connected players.
  const next = await waitForChoiceOrGameOver(survivors);
  expect(next).not.toBeNull();

  for (const page of survivors) await page.close();
});

test("Chain Reaction: two browsers complete a match with a synchronized explosion, winner and rematch", async ({
  browser,
}) => {
  const host = await browser.newPage();
  const guest = await browser.newPage();
  const code = await createRoom(host, CHAIN_URL, "Alice");
  await joinRoom(guest, CHAIN_URL, code, "Bob");

  await host.getByRole("button", { name: "Start game" }).click();
  await expect(host.locator(".board")).toBeVisible();

  const pages = [host, guest];

  // Scripted but adversarial: both players stack orbs in the top-left corner.
  // The first player's second orb reaches critical mass and captures the
  // second player's only orb, eliminating them after three valid moves.
  const firstMover = await chainPlace(pages, 0, 0, 1);
  const secondMover = await chainPlace(pages, 0, 1, 2);
  expect(secondMover).not.toBe(firstMover);
  await chainPlace(pages, 0, 0, 3);

  await waitForGameOver(host);
  await waitForGameOver(guest);

  // Both clients must converge on the same authoritative board.
  expect(await chainBoardState(host)).toEqual(await chainBoardState(guest));

  const winnerName = firstMover === host ? "Alice" : "Bob";
  await expect(host.locator(".overlay-title")).toContainText(`${winnerName} wins the board`);
  await expect(guest.locator(".overlay-title")).toContainText(`${winnerName} wins the board`);
  await expect(host.locator(".capture-line")).toContainText("1 orb captured");

  await host.getByRole("button", { name: "Rematch" }).click();
  await pageWithChainTurn(pages);
  await expect(host.locator(".chain-head-title")).toContainText("0 moves");
  await expect(guest.locator(".board")).toBeVisible();

  await host.close();
  await guest.close();
});

test("Chain Reaction: four players rotate turns, agree on the board and finish through surrenders", async ({
  browser,
}) => {
  const host = await browser.newPage();
  const guests = [await browser.newPage(), await browser.newPage(), await browser.newPage()];
  const code = await createRoom(host, CHAIN_URL, "Alice");
  const names = ["Bob", "Carol", "Dave"];
  for (let index = 0; index < guests.length; index += 1) {
    await joinRoom(guests[index], CHAIN_URL, code, names[index]);
  }

  await expect(host.locator(".player")).toHaveCount(4);
  await host.getByRole("button", { name: "Start game" }).click();
  await expect(host.locator(".board")).toBeVisible();

  const pages = [host, ...guests];

  const firstMover = await chainPlace(pages, 2, 4, 1);
  const secondMover = await chainPlace(pages, 3, 4, 2);
  const thirdMover = await chainPlace(pages, 2, 5, 3);
  const fourthMover = await chainPlace(pages, 3, 5, 4);

  // Every active player gets exactly one turn before the order repeats.
  expect(new Set([firstMover, secondMover, thirdMover, fourthMover]).size).toBe(4);

  for (const page of pages) {
    await expect(page.locator(".board .cell")).toHaveCount(54);
  }
  const reference = await chainBoardState(host);
  for (const page of pages.slice(1)) {
    expect(await chainBoardState(page)).toEqual(reference);
  }
  expect(reference.filter((cell) => cell.owner === "true").length).toBe(4);

  // Surrender three seats. The last connected seat wins without needing a
  // long elimination cascade, and every client receives the same result.
  for (const guest of guests) {
    guest.once("dialog", (dialog) => dialog.accept());
    await guest.getByRole("button", { name: "Surrender" }).click();
    await expect(guest.locator(".player--out")).toHaveCount(guests.indexOf(guest) + 1);
  }

  for (const page of pages) await waitForGameOver(page);
  await expect(host.locator(".overlay-title")).toContainText("Alice wins the board");

  await host.getByRole("button", { name: "Rematch" }).click();
  await pageWithChainTurn(pages);
  await expect(host.locator(".player")).toHaveCount(4);

  await host.close();
  for (const guest of guests) await guest.close();
});
