import { encodeTrip, tripFromHash } from "./codec";
import { amountProblem, csvCell, formatMoney, formatSignedMoney, parseAmount } from "./money";
import {
  createDefaultTrip,
  displayName,
  loadStoredTrip,
  playerSpends,
  storeTrip,
  type Expense,
  type Player,
  type TripState,
} from "./model";
import { settle, type Settlement, type Transfer } from "./settlement";
import { copy, sentenceText, type SentencePart } from "./strings";

export function mount(root: HTMLElement): void {
  const fromHash = tripFromHash(location.hash);
  let state = fromHash ?? loadStoredTrip() ?? createDefaultTrip();
  if (fromHash) storeTrip(fromHash);

  const playerList = h("div", { id: "player-list" });
  const expenseList = h("div", { id: "expense-list" });
  const expenseHead = h(
    "div",
    { class: "expense-head" },
    h("span", null, copy.description),
    h("span", null, copy.paidBy),
    h("span", null, copy.amount),
    h("span"),
  );
  const summaryBody = h("div", { id: "summary-body" });
  const toast = h("p", { id: "toast", class: "toast", role: "status" });
  toast.hidden = true;

  const currencyInput = h("input", {
    id: "currency",
    type: "text",
    dir: "auto",
    maxlength: "4",
    autocomplete: "off",
    spellcheck: "false",
  });
  currencyInput.value = state.currency;

  const dialog = h("dialog");
  const confirmText = h("p", { dir: "auto" });
  const cancelBtn = h("button", { type: "button" }, copy.cancel);
  const okBtn = h("button", { type: "button", class: "danger" }, copy.remove);
  cancelBtn.addEventListener("click", () => dialog.close("cancel"));
  okBtn.addEventListener("click", () => dialog.close("ok"));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close("cancel");
  });
  dialog.append(confirmText, h("div", { class: "dialog-actions" }, cancelBtn, okBtn));

  const currencyLabel = h("label", { class: "currency" });
  currencyLabel.append(copy.currency, currencyInput);

  root.replaceChildren(
    h(
      "div",
      { class: "wrap" },
      h(
        "header",
        null,
        h("p", { class: "kicker" }, copy.kicker),
        h("h1", null, copy.pageTitle),
        h("p", { class: "tagline" }, copy.tagline),
        h(
          "div",
          { class: "top-actions" },
          currencyLabel,
          h("button", { type: "button", id: "share", class: "primary" }, copy.share),
        ),
      ),
      h(
        "section",
        { class: "card", "aria-labelledby": "players-heading" },
        h("h2", { id: "players-heading" }, copy.players),
        playerList,
        h("button", { type: "button", id: "add-player", class: "add" }, copy.addPlayer),
      ),
      h(
        "section",
        { class: "card", "aria-labelledby": "expenses-heading" },
        h("h2", { id: "expenses-heading" }, copy.expenses),
        expenseHead,
        expenseList,
        h("button", { type: "button", id: "add-expense", class: "add" }, copy.addExpense),
      ),
      h(
        "section",
        { class: "card", "aria-labelledby": "summary-heading" },
        h("h2", { id: "summary-heading" }, copy.summary),
        summaryBody,
      ),
      h(
        "div",
        { class: "extras" },
        h("button", { type: "button", id: "copy-settlement" }, copy.copySettlement),
        h("button", { type: "button", id: "export-csv" }, copy.exportCsv),
        h("button", { type: "button", id: "reset-trip", class: "danger" }, copy.reset),
      ),
      h("p", { class: "footer" }, copy.footer),
    ),
    toast,
    dialog,
  );

  document.title = copy.pageTitle;
  let toastTimer = 0;

  root.addEventListener("input", onEdit);
  root.addEventListener("change", onEdit);
  root.addEventListener("focusout", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.field === "amount") commitAmount(target);
    if (target.id === "currency") commitCurrency(target);
  });
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const removePlayerBtn = target.closest<HTMLElement>("[data-remove-player]");
    const deleteExpenseBtn = target.closest<HTMLElement>("[data-delete-expense]");
    if (removePlayerBtn?.dataset.removePlayer) {
      void removePlayer(removePlayerBtn.dataset.removePlayer);
      return;
    }
    if (deleteExpenseBtn?.dataset.deleteExpense) {
      deleteExpense(deleteExpenseBtn.dataset.deleteExpense);
      return;
    }
    if (target.closest("#add-player")) addPlayer();
    else if (target.closest("#add-expense")) addExpense();
    else if (target.closest("#share")) void shareLink();
    else if (target.closest("#copy-settlement")) void copySettlement();
    else if (target.closest("#export-csv")) exportCsv();
    else if (target.closest("#reset-trip")) void resetTrip();
  });

  renderPlayers();
  renderExpenses();
  renderSummary();
  persist();

  function onEdit(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.playerId) {
      const index = state.players.findIndex((player) => player.id === target.dataset.playerId);
      const player = state.players[index];
      if (!player || player.name === target.value) return;
      player.name = target.value;
      const button = playerList.querySelector<HTMLButtonElement>(
        `[data-remove-player="${CSS.escape(player.id)}"]`,
      );
      if (button) {
        const label =
          state.players.length > 2 ? copy.removePlayerNamed(displayName(player.name, index)) : copy.keepTwo;
        button.setAttribute("aria-label", label);
        button.title = label;
      }
      persist();
      refreshPaidByLabels();
      renderSummary();
      return;
    }
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

    if (target.id === "currency" && target instanceof HTMLInputElement) {
      if (state.currency === target.value) return;
      state.currency = target.value;
      persist();
      renderSummary();
      return;
    }
    if (target.id === "minimize" && target instanceof HTMLInputElement) {
      if (state.minimize === target.checked) return;
      state.minimize = target.checked;
      persist();
      renderSummary();
      return;
    }
    if (target.id === "focus-player" && target instanceof HTMLSelectElement) {
      if (state.focusId === target.value) return;
      state.focusId = target.value;
      persist();
      renderSummary();
      return;
    }

    const expenseId = target.dataset.expenseId;
    const fieldName = target.dataset.field;
    if (!expenseId || !fieldName) return;
    const expense = state.expenses.find((item) => item.id === expenseId);
    if (!expense) return;

    if (fieldName === "description" && target instanceof HTMLInputElement) {
      if (expense.description === target.value) return;
      expense.description = target.value;
      const button = target.closest(".expense")?.querySelector<HTMLButtonElement>("[data-delete-expense]");
      if (button) button.setAttribute("aria-label", copy.deleteExpenseNamed(target.value));
      persist();
      return;
    }
    if (fieldName === "amount" && target instanceof HTMLInputElement) {
      if (expense.amount === target.value) return;
      expense.amount = target.value;
      updateAmountError(target);
      persist();
      renderSummary();
      return;
    }
    if (fieldName === "paidBy" && target instanceof HTMLSelectElement) {
      if (expense.paidBy === target.value) return;
      expense.paidBy = target.value;
      persist();
      renderSummary();
    }
  }

  function renderPlayers(): void {
    const canRemove = state.players.length > 2;
    playerList.replaceChildren(
      ...state.players.map((player, index) => playerRow(player, index, canRemove)),
    );
  }

  function renderExpenses(): void {
    expenseHead.hidden = state.expenses.length === 0;
    expenseList.replaceChildren(...state.expenses.map((expense) => expenseCard(expense)));
  }

  function renderSummary(): void {
    const result = currentSettlement();
    const currency = activeCurrency();
    summaryBody.replaceChildren(
      stats(result, currency),
      balanceTable(result, currency),
      settlementBlock(result, currency, state.minimize),
      personalBlock(result, currency, state),
    );
  }

  function addPlayer(): void {
    const id = crypto.randomUUID();
    state.players.push({ id, name: "" });
    persist();
    renderPlayers();
    renderExpenses();
    renderSummary();
    playerList.querySelector<HTMLInputElement>(`input[data-player-id="${CSS.escape(id)}"]`)?.focus();
  }

  async function removePlayer(id: string): Promise<void> {
    if (state.players.length <= 2) return;
    const index = state.players.findIndex((player) => player.id === id);
    if (index < 0) return;
    if (playerHasExpenses(id)) {
      const ok = await ask(copy.confirmRemove(displayName(state.players[index].name, index)), copy.remove);
      if (!ok) return;
    }
    state.players.splice(index, 1);
    state.expenses = state.expenses.filter((expense) => expense.paidBy !== id);
    if (!state.players.some((player) => player.id === state.focusId)) state.focusId = state.players[0].id;
    persist();
    renderPlayers();
    renderExpenses();
    renderSummary();
  }

  function addExpense(): void {
    const id = crypto.randomUUID();
    state.expenses.push({
      id,
      description: "",
      paidBy: state.players[0]?.id ?? "",
      amount: "",
    });
    persist();
    renderExpenses();
    expenseList
      .querySelector<HTMLInputElement>(
        `input[data-expense-id="${CSS.escape(id)}"][data-field="description"]`,
      )
      ?.focus();
  }

  function deleteExpense(id: string): void {
    state.expenses = state.expenses.filter((expense) => expense.id !== id);
    persist();
    renderExpenses();
    renderSummary();
    root.querySelector<HTMLButtonElement>("#add-expense")?.focus();
  }

  async function resetTrip(): Promise<void> {
    const ok = await ask(copy.confirmReset, copy.resetAction);
    if (!ok) return;
    state = createDefaultTrip();
    currencyInput.value = state.currency;
    persist();
    renderPlayers();
    renderExpenses();
    renderSummary();
    playerList.querySelector<HTMLInputElement>("input")?.focus();
  }

  async function shareLink(): Promise<void> {
    persist();
    const ok = await copyText(location.href);
    showToast(ok ? copy.linkCopied : location.href);
  }

  async function copySettlement(): Promise<void> {
    const text = settlementPlainText(currentSettlement());
    const ok = await copyText(text);
    showToast(ok ? copy.settlementCopied : text);
  }

  function exportCsv(): void {
    const result = currentSettlement();
    const lines = [copy.csvExpenseHeader];
    for (const expense of state.expenses) {
      const index = state.players.findIndex((player) => player.id === expense.paidBy);
      const name = index >= 0 ? displayName(state.players[index].name, index) : "";
      const amount = parseAmount(expense.amount);
      lines.push(
        [csvCell(expense.description), csvCell(name), amount == null ? "" : amount.toFixed(2)].join(","),
      );
    }
    lines.push("", copy.csvBalanceHeader);
    for (const row of result.balances) {
      lines.push(
        [csvCell(row.name), row.spent.toFixed(2), row.share.toFixed(2), row.balance.toFixed(2)].join(","),
      );
    }
    const blob = new Blob([`\uFEFF${lines.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = h("a", { href: url, download: "trip-split.csv" });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function persist(): void {
    storeTrip(state);
    const nextHash = `#${encodeTrip(state)}`;
    if (location.hash === nextHash) return;
    history.replaceState(null, "", `${location.pathname}${location.search}${nextHash}`);
  }

  function currentSettlement(): Settlement {
    return settle(
      playerSpends(state.players, state.expenses),
      state.minimize ? "minimize" : "proportional",
    );
  }

  function activeCurrency(): string {
    return state.currency.trim() || "₪";
  }

  function playerHasExpenses(id: string): boolean {
    return state.expenses.some(
      (expense) =>
        expense.paidBy === id && (expense.description.trim() !== "" || expense.amount.trim() !== ""),
    );
  }

  function refreshPaidByLabels(): void {
    const names = new Map(
      state.players.map((player, index) => [player.id, displayName(player.name, index)]),
    );
    for (const select of root.querySelectorAll<HTMLSelectElement>("select[data-field='paidBy']")) {
      for (const option of select.options) {
        const name = names.get(option.value);
        if (name) option.textContent = name;
      }
    }
  }

  function updateAmountError(input: HTMLInputElement): void {
    const problem = amountProblem(input.value);
    input.setAttribute("aria-invalid", problem ? "true" : "false");
    const amountField = input.closest(".field");
    const existing = amountField?.querySelector(".field-error");
    if (!problem) {
      existing?.remove();
      return;
    }
    const message = problem === "negative" ? copy.negativeAmount : copy.invalidAmount;
    if (existing) {
      existing.textContent = message;
      return;
    }
    amountField?.append(h("p", { class: "field-error", role: "alert" }, message));
  }

  function commitAmount(input: HTMLInputElement): void {
    const parsed = parseAmount(input.value);
    if (parsed == null) return;
    const next = parsed.toFixed(2);
    const expense = state.expenses.find((item) => item.id === input.dataset.expenseId);
    if (!expense || (input.value === next && expense.amount === next)) return;
    input.value = next;
    expense.amount = next;
    updateAmountError(input);
    persist();
    renderSummary();
  }

  function commitCurrency(input: HTMLInputElement): void {
    const next = input.value.trim().slice(0, 4) || "₪";
    input.value = next;
    if (state.currency === next) return;
    state.currency = next;
    persist();
    renderSummary();
  }

  function settlementPlainText(result: Settlement): string {
    const currency = activeCurrency();
    const lines = [
      `${copy.totalSpent} ${formatMoney(result.total, currency)}`,
      `${copy.fairShare} ${formatMoney(result.share, currency)}`,
      "",
    ];
    if (result.transfers.length === 0) lines.push(copy.allSettled);
    else {
      for (const transfer of result.transfers) {
        lines.push(sentenceText(transferParts(transfer, currency)));
      }
    }
    return lines.join("\n");
  }

  function ask(message: string, okLabel: string): Promise<boolean> {
    confirmText.textContent = message;
    okBtn.textContent = okLabel;
    dialog.showModal();
    return new Promise((resolve) => {
      dialog.addEventListener(
        "close",
        () => {
          resolve(dialog.returnValue === "ok");
        },
        { once: true },
      );
    });
  }

  function showToast(message: string): void {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function playerRow(player: Player, index: number, canRemove: boolean): HTMLElement {
    const name = displayName(player.name, index);
    const input = h("input", {
      type: "text",
      dir: "auto",
      placeholder: copy.playerPlaceholder,
      "aria-label": copy.playerName,
      "data-player-id": player.id,
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
      enterkeyhint: "done",
    });
    input.value = player.name;
    const label = canRemove ? copy.removePlayerNamed(name) : copy.keepTwo;
    const remove = h(
      "button",
      {
        type: "button",
        "data-remove-player": player.id,
        "aria-label": label,
        title: label,
      },
      copy.remove,
    );
    remove.disabled = !canRemove;
    const row = h("div", { class: "player-row" });
    row.append(input, remove);
    return row;
  }

  function expenseCard(expense: Expense): HTMLElement {
    const description = h("input", {
      type: "text",
      dir: "auto",
      placeholder: copy.expensePlaceholder,
      "data-expense-id": expense.id,
      "data-field": "description",
      autocomplete: "off",
    });
    description.value = expense.description;

    const paidBy = h("select", {
      "data-expense-id": expense.id,
      "data-field": "paidBy",
    });
    for (const [index, player] of state.players.entries()) {
      const choice = h("option", { value: player.id }, displayName(player.name, index));
      choice.selected = player.id === expense.paidBy;
      paidBy.append(choice);
    }

    const amount = h("input", {
      type: "text",
      dir: "auto",
      inputmode: "decimal",
      placeholder: copy.amountPlaceholder,
      "data-expense-id": expense.id,
      "data-field": "amount",
      autocomplete: "off",
      enterkeyhint: "done",
    });
    amount.value = expense.amount;
    const problem = amountProblem(expense.amount);
    if (problem) amount.setAttribute("aria-invalid", "true");

    const amountField = field(copy.amount, amount);
    if (problem) {
      amountField.append(
        h(
          "p",
          { class: "field-error", role: "alert" },
          problem === "negative" ? copy.negativeAmount : copy.invalidAmount,
        ),
      );
    }

    const card = h("article", { class: "expense" });
    card.append(
      field(copy.description, description),
      h("div", { class: "expense-pair" }, field(copy.paidBy, paidBy), amountField),
      h(
        "button",
        {
          type: "button",
          class: "delete",
          "data-delete-expense": expense.id,
          "aria-label": copy.deleteExpenseNamed(expense.description),
        },
        copy.deleteExpense,
      ),
    );
    return card;
  }
}

function settlementBlock(result: Settlement, currency: string, minimize: boolean): HTMLElement {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = "minimize";
  input.className = "sr-only";
  input.checked = minimize;
  const label = h("label", { class: "switch" });
  label.append(input, h("span", { class: "track", "aria-hidden": "true" }), copy.minimize);

  const list = h("ul", { class: "transfers" });
  if (result.transfers.length === 0) {
    list.append(h("li", null, h("p", null, copy.allSettled)));
  } else {
    for (const transfer of result.transfers) {
      list.append(h("li", null, renderSentence(transferParts(transfer, currency))));
    }
  }

  return h(
    "div",
    null,
    h("h3", null, copy.settlement),
    label,
    h("p", { class: "hint" }, minimize ? copy.minimizeHint : copy.proportionalHint),
    list,
  );
}

function personalBlock(result: Settlement, currency: string, state: TripState): HTMLElement {
  const select = h("select", { id: "focus-player" });
  for (const [index, player] of state.players.entries()) {
    const choice = h("option", { value: player.id }, displayName(player.name, index));
    choice.selected = player.id === state.focusId;
    select.append(choice);
  }
  const label = h("label", { class: "field" });
  label.append(h("span", { class: "label" }, copy.showFor), select);

  const focus = result.balances.find((row) => row.id === state.focusId) ?? result.balances[0];
  const block = h("div");
  block.append(h("h3", null, copy.onePlayer), label);
  if (!focus) return block;

  block.append(
    h(
      "p",
      { class: "personal-balance" },
      copy.balanceLine(
        formatMoney(focus.spent, currency),
        formatMoney(focus.share, currency),
        formatSignedMoney(focus.balance, currency),
      ),
    ),
  );

  const list = h("ul", { class: "transfers" });
  const mine = result.transfers.filter(
    (transfer) => transfer.fromId === focus.id || transfer.toId === focus.id,
  );
  if (mine.length === 0) {
    list.append(h("li", null, h("p", null, copy.nothingForPlayer)));
  } else {
    for (const transfer of mine) {
      const parts =
        transfer.fromId === focus.id
          ? copy.youPay(transfer.toName, formatMoney(transfer.amount, currency))
          : copy.youReceive(transfer.fromName, formatMoney(transfer.amount, currency));
      list.append(h("li", null, renderSentence(parts)));
    }
  }
  block.append(list);
  return block;
}

function stats(result: Settlement, currency: string): HTMLElement {
  return h(
    "div",
    { class: "stats" },
    h(
      "div",
      { class: "stat" },
      h("p", { class: "stat-label" }, copy.totalSpent),
      h("p", { class: "stat-value" }, formatMoney(result.total, currency)),
    ),
    h(
      "div",
      { class: "stat" },
      h("p", { class: "stat-label" }, copy.fairShare),
      h("p", { class: "stat-value" }, formatMoney(result.share, currency)),
      h("p", { class: "stat-note" }, copy.each),
    ),
  );
}

function balanceTable(result: Settlement, currency: string): HTMLElement {
  const head = h("tr");
  for (const label of [copy.playerColumn, copy.spent, copy.fairShare, copy.balance]) {
    head.append(h("th", { scope: "col" }, label));
  }
  const body = h("tbody");
  for (const row of result.balances) {
    const nameCell = h("th", { scope: "row" });
    const name = h("bdi");
    name.textContent = row.name;
    nameCell.append(name);
    const cents = Math.round(row.balance * 100 + Math.sign(row.balance) * 1e-6);
    body.append(
      h(
        "tr",
        null,
        nameCell,
        moneyCell(formatMoney(row.spent, currency)),
        moneyCell(formatMoney(row.share, currency)),
        balanceCell(formatSignedMoney(row.balance, currency), cents),
      ),
    );
  }
  const table = h(
    "table",
    { class: "balance" },
    h("caption", { class: "sr-only" }, copy.balanceCaption),
    h("thead", null, head),
    body,
  );
  return h("div", { class: "table-wrap" }, table);
}

function transferParts(transfer: Transfer, currency: string): SentencePart[] {
  return copy.pays(transfer.fromName, transfer.toName, formatMoney(transfer.amount, currency));
}

function renderSentence(parts: readonly SentencePart[]): HTMLParagraphElement {
  const paragraph = h("p");
  for (const part of parts) {
    if (part.type === "name") {
      const name = h("bdi");
      name.textContent = part.text;
      paragraph.append(name);
    } else {
      paragraph.append(part.text);
    }
  }
  return paragraph;
}

function moneyCell(text: string): HTMLTableCellElement {
  const cell = h("td");
  cell.textContent = text;
  return cell;
}

function balanceCell(text: string, cents: number): HTMLTableCellElement {
  const cell = h("td");
  cell.textContent = text;
  cell.className = cents > 0 ? "pos" : cents < 0 ? "neg" : "zero";
  return cell;
}

function field(label: string, control: HTMLElement): HTMLLabelElement {
  const wrap = h("label", { class: "field" });
  wrap.append(h("span", { class: "label" }, label), control);
  return wrap;
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string> | null,
  ...children: Array<Node | string | null | undefined | false>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    node.append(child);
  }
  return node;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection fallback.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
