import { encodeTrip, tripFromHash } from "./codec";
import {
  currencyName,
  currencyShortLabel,
  otherCurrencies,
  primaryCurrencies,
  resolveCurrency,
} from "./currencies";
import { langFromSearch, resolveLang, shareLocation } from "./share-url";
import { amountProblem, csvCell, formatMoney, formatSignedMoney, parseAmount } from "./money";
import {
  clampWeight,
  createDefaultTrip,
  displayName,
  entryType,
  entryWeight,
  loadStoredTrip,
  playerSpends,
  storeTrip,
  type Expense,
  type Player,
  type TripState,
} from "./model";
import {
  loadLang,
  loadTheme,
  parseLang,
  parseTheme,
  resolvedTheme,
  saveLang,
  saveTheme,
  type Lang,
  type ThemeChoice,
} from "./preferences";
import { settle, type Settlement, type Transfer } from "./settlement";
import { copyFor, sentenceText, type SentencePart } from "./strings";

let uiLang: Lang = "en";

function t() {
  return copyFor(uiLang);
}

function nameOf(name: string, index: number): string {
  return displayName(name, index, uiLang);
}

export function mount(root: HTMLElement): void {
  const fromHash = tripFromHash(location.hash);
  let state = fromHash ?? loadStoredTrip() ?? createDefaultTrip();
  state.currency = resolveCurrency(state.currency);
  if (fromHash) storeTrip(fromHash);

  const urlLang = langFromSearch(location.search);
  uiLang = resolveLang(location.search, loadLang());
  if (urlLang) saveLang(uiLang);
  let theme = loadTheme();
  let playerList: HTMLDivElement;
  let expenseList: HTMLDivElement;
  let expenseHead: HTMLDivElement;
  let summaryBody: HTMLDivElement;
  let toast: HTMLParagraphElement;
  let currencySelect: HTMLSelectElement;
  let currencyFace: HTMLElement;
  let dialog: HTMLDialogElement;
  let confirmText: HTMLParagraphElement;
  let cancelBtn: HTMLButtonElement;
  let okBtn: HTMLButtonElement;
  let toastTimer = 0;

  const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
  themeMedia.addEventListener("change", () => {
    if (theme === "system") applyThemeChoice(theme);
  });

  function paint(): void {
    applyLanguage(uiLang);
    applyThemeChoice(theme);

    playerList = h("div", { id: "player-list" });
    expenseList = h("div", { id: "expense-list" });
    expenseHead = h(
      "div",
      { class: "expense-head" },
      h("span", null, t().description),
      h("span", null, t().paidBy),
      h("span", null, t().amount),
      h("span"),
    );
    summaryBody = h("div", { id: "summary-body" });
    toast = h("p", { id: "toast", class: "toast", role: "status" });
    toast.hidden = true;

    currencySelect = h("select", { id: "currency" });
    fillCurrencySelect(currencySelect, state.currency);
    bindCurrencyMenu(currencySelect);
    currencyFace = h(
      "span",
      { class: "currency-face", dir: "ltr", "aria-hidden": "true" },
      currencyShortLabel(state.currency),
    );
    const currencyControl = h("span", { class: "currency-control" });
    currencyControl.append(currencySelect, currencyFace);

    dialog = h("dialog");
    confirmText = h("p", { dir: "auto" });
    cancelBtn = h("button", { type: "button" }, t().cancel);
    okBtn = h("button", { type: "button", class: "danger" }, t().remove);
    cancelBtn.addEventListener("click", () => dialog.close("cancel"));
    okBtn.addEventListener("click", () => dialog.close("ok"));
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("cancel");
    });
    dialog.append(confirmText, h("div", { class: "dialog-actions" }, cancelBtn, okBtn));

    const currencyLabel = h("label", { class: "currency-label", for: "currency" }, t().currency);
    const shareButton = () =>
      h("button", { type: "button", class: "primary", "data-action": "share" }, t().share);
    const topShare = shareButton();
    topShare.classList.add("share-beside");

    root.replaceChildren(
      appBar(theme),
      h(
        "div",
        { class: "wrap" },
        h(
          "header",
          null,
          h("p", { class: "kicker" }, t().kicker),
          h("h1", null, t().pageTitle),
          h("p", { class: "tagline" }, t().tagline),
          h("div", { class: "top-actions" }, currencyLabel, currencyControl, topShare),
        ),
        h(
          "section",
          { class: "card", "aria-labelledby": "players-heading" },
          h("h2", { id: "players-heading" }, t().members),
          playerList,
          h("button", { type: "button", id: "add-player", class: "add" }, t().addMember),
        ),
        h(
          "section",
          { class: "card", "aria-labelledby": "expenses-heading" },
          h("h2", { id: "expenses-heading" }, t().expenses),
          expenseHead,
          expenseList,
          h("button", { type: "button", id: "add-expense", class: "add" }, t().addExpense),
        ),
        h(
          "section",
          { class: "card", "aria-labelledby": "summary-heading" },
          h("h2", { id: "summary-heading" }, t().summary),
          summaryBody,
        ),
        h(
          "div",
          { class: "extras" },
          shareButton(),
          h("button", { type: "button", id: "copy-settlement" }, t().copySettlement),
          h("button", { type: "button", id: "export-csv" }, t().exportCsv),
          h("button", { type: "button", id: "reset-trip", class: "danger" }, t().reset),
        ),
        h("p", { class: "footer" }, t().footer),
      ),
      toast,
      dialog,
    );

    document.title = t().pageTitle;
    renderPlayers();
    renderExpenses();
    renderSummary();
  }

  root.addEventListener("input", onEdit);
  root.addEventListener("change", onEdit);
  root.addEventListener("focusout", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.field === "amount") commitAmount(target);
    if (target instanceof HTMLInputElement && target.dataset.field === "weight") commitWeight(target);
  });
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const choice = target.closest<HTMLElement>("[data-choice]");
    if (choice?.dataset.choice === "kind" && choice.dataset.playerId && choice.dataset.value) {
      setEntryType(choice.dataset.playerId, choice.dataset.value);
      return;
    }
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
    else if (target.closest("[data-action='share']")) void shareLink();
    else if (target.closest("#copy-settlement")) void copySettlement();
    else if (target.closest("#export-csv")) exportCsv();
    else if (target.closest("#reset-trip")) void resetTrip();
  });

  paint();
  persist();

  function onEdit(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.field === "weight" && target.dataset.playerId) {
      const player = state.players.find((item) => item.id === target.dataset.playerId);
      if (!player || player.type !== "group") return;
      if (!/^\d+$/.test(target.value)) return;
      const next = Number(target.value);
      if (next < 1 || next > 99 || player.weight === next) return;
      player.weight = next;
      persist();
      renderSummary();
      return;
    }
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
          state.players.length > 2 ? t().removeMemberNamed(nameOf(player.name, index)) : t().keepTwo;
        button.setAttribute("aria-label", label);
        button.title = label;
      }
      persist();
      refreshPaidByLabels();
      renderSummary();
      return;
    }
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

    if (target.id === "currency" && target instanceof HTMLSelectElement) {
      const next = resolveCurrency(target.value);
      if (state.currency === next) return;
      state.currency = next;
      currencyFace.textContent = currencyShortLabel(next);
      currencySelect.title = currencyName(next, uiLang);
      persist();
      renderSummary();
      return;
    }
    if (target.id === "theme" && target instanceof HTMLSelectElement) {
      theme = parseTheme(target.value);
      saveTheme(theme);
      applyThemeChoice(theme);
      return;
    }
    if (target.id === "lang" && target instanceof HTMLSelectElement) {
      const next = parseLang(target.value);
      if (next === uiLang) return;
      uiLang = next;
      saveLang(uiLang);
      paint();
      persist();
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
      if (button) button.setAttribute("aria-label", t().deleteExpenseNamed(target.value));
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
      balanceTable(result, currency, state),
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
      const ok = await ask(t().confirmRemove(nameOf(state.players[index].name, index)), t().remove);
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
    const ok = await ask(t().confirmReset, t().resetAction);
    if (!ok) return;
    state = createDefaultTrip();
    fillCurrencySelect(currencySelect, state.currency);
    currencyFace.textContent = currencyShortLabel(state.currency);
    currencySelect.title = currencyName(state.currency, uiLang);
    persist();
    renderPlayers();
    renderExpenses();
    renderSummary();
    playerList.querySelector<HTMLInputElement>("input")?.focus();
  }

  async function shareLink(): Promise<void> {
    persist();
    const ok = await copyText(location.href);
    showToast(ok ? t().linkCopied : location.href);
  }

  async function copySettlement(): Promise<void> {
    const text = settlementPlainText(currentSettlement());
    const ok = await copyText(text);
    showToast(ok ? t().settlementCopied : text);
  }

  function exportCsv(): void {
    const result = currentSettlement();
    const lines = [t().csvExpenseHeader];
    for (const expense of state.expenses) {
      const index = state.players.findIndex((player) => player.id === expense.paidBy);
      const name = index >= 0 ? nameOf(state.players[index].name, index) : "";
      const amount = parseAmount(expense.amount);
      lines.push(
        [csvCell(expense.description), csvCell(name), amount == null ? "" : amount.toFixed(2)].join(","),
      );
    }
    lines.push("", t().csvBalanceHeader);
    for (const row of result.balances) {
      const player = state.players.find((item) => item.id === row.id);
      const typeLabel = player && entryType(player) === "group" ? t().entryGroup : t().entryMember;
      const weight = player ? entryWeight(player) : 1;
      lines.push(
        [
          csvCell(row.name),
          csvCell(typeLabel),
          String(weight),
          row.spent.toFixed(2),
          row.share.toFixed(2),
          row.balance.toFixed(2),
        ].join(","),
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
    const next = shareLocation(location.href, encodeTrip(state), uiLang);
    if (next !== location.href) history.replaceState(null, "", next);
  }

  function currentSettlement(): Settlement {
    return settle(
      playerSpends(state.players, state.expenses, uiLang),
      state.minimize ? "minimize" : "proportional",
    );
  }

  function activeCurrency(): string {
    return resolveCurrency(state.currency);
  }

  function setEntryType(id: string, kind: string): void {
    const player = state.players.find((item) => item.id === id);
    if (!player) return;
    if (kind === "group") {
      if (player.type === "group") return;
      player.type = "group";
      player.weight = 2;
    } else {
      if (player.type !== "group") return;
      player.type = "member";
      player.weight = 1;
    }
    persist();
    renderPlayers();
    renderSummary();
  }

  function commitWeight(input: HTMLInputElement): void {
    const player = state.players.find((item) => item.id === input.dataset.playerId);
    if (!player || player.type !== "group") return;
    const parsed = Number(input.value);
    const next = input.value.trim() === "" || !Number.isFinite(parsed) ? 2 : clampWeight(parsed, 2);
    input.value = String(next);
    if (player.weight === next) return;
    player.weight = next;
    persist();
    renderSummary();
  }

  function playerHasExpenses(id: string): boolean {
    return state.expenses.some(
      (expense) =>
        expense.paidBy === id && (expense.description.trim() !== "" || expense.amount.trim() !== ""),
    );
  }

  function refreshPaidByLabels(): void {
    const names = new Map(
      state.players.map((player, index) => [player.id, nameOf(player.name, index)]),
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
    const message = problem === "negative" ? t().negativeAmount : t().invalidAmount;
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

  function settlementPlainText(result: Settlement): string {
    const currency = activeCurrency();
    const lines = [
      `${t().totalSpent} ${formatMoney(result.total, currency)}`,
      `${t().fairShare} ${formatMoney(result.share, currency)}`,
      "",
    ];
    if (result.transfers.length === 0) lines.push(t().allSettled);
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
    const name = nameOf(player.name, index);
    const input = h("input", {
      type: "text",
      class: "player-name",
      dir: "auto",
      placeholder: t().memberPlaceholder,
      "aria-label": t().memberName,
      "data-player-id": player.id,
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
      enterkeyhint: "done",
    });
    input.value = player.name;
    const label = canRemove ? t().removeMemberNamed(name) : t().keepTwo;
    const remove = h(
      "button",
      {
        type: "button",
        class: "player-remove",
        "data-remove-player": player.id,
        "aria-label": label,
        title: label,
      },
      t().remove,
    );
    remove.disabled = !canRemove;
    const group = entryType(player) === "group";
    const kind = h("div", {
      class: "kind-toggle",
      role: "group",
      "aria-label": `${name} ${t().entryType}`,
    });
    for (const option of [
      { value: "member", label: t().entryMember, selected: !group },
      { value: "group", label: t().entryGroup, selected: group },
    ]) {
      kind.append(
        h(
          "button",
          {
            type: "button",
            class: option.selected ? "choice-btn is-selected" : "choice-btn",
            "data-choice": "kind",
            "data-value": option.value,
            "data-player-id": player.id,
            "aria-pressed": option.selected ? "true" : "false",
          },
          option.label,
        ),
      );
    }
    const main = h("div", { class: "player-main" });
    main.append(input, kind, remove);
    const row = h("div", { class: "player-row" });
    row.append(main);
    if (group) {
      const weight = h("input", {
        type: "text",
        inputmode: "numeric",
        dir: "ltr",
        maxlength: "2",
        "data-player-id": player.id,
        "data-field": "weight",
        "aria-label": `${name} ${t().payingMembers}`,
        title: t().payingMembers,
        autocomplete: "off",
      });
      weight.value = String(entryWeight(player));
      const weightLabel = h("label", { class: "weight-field" });
      weightLabel.append(h("span", null, t().payingMembers), weight);
      row.append(weightLabel);
    }
    return row;
  }

  function expenseCard(expense: Expense): HTMLElement {
    const description = h("input", {
      type: "text",
      dir: "auto",
      placeholder: t().expensePlaceholder,
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
      const choice = h("option", { value: player.id }, nameOf(player.name, index));
      choice.selected = player.id === expense.paidBy;
      paidBy.append(choice);
    }

    const amount = h("input", {
      type: "text",
      dir: "auto",
      inputmode: "decimal",
      placeholder: t().amountPlaceholder,
      "data-expense-id": expense.id,
      "data-field": "amount",
      autocomplete: "off",
      enterkeyhint: "done",
    });
    amount.value = expense.amount;
    const problem = amountProblem(expense.amount);
    if (problem) amount.setAttribute("aria-invalid", "true");

    const amountField = field(t().amount, amount);
    if (problem) {
      amountField.append(
        h(
          "p",
          { class: "field-error", role: "alert" },
          problem === "negative" ? t().negativeAmount : t().invalidAmount,
        ),
      );
    }

    const card = h("article", { class: "expense" });
    card.append(
      field(t().description, description),
      h("div", { class: "expense-pair" }, field(t().paidBy, paidBy), amountField),
      h(
        "button",
        {
          type: "button",
          class: "delete",
          "data-delete-expense": expense.id,
          "aria-label": t().deleteExpenseNamed(expense.description),
        },
        t().deleteExpense,
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
  label.append(input, h("span", { class: "track", "aria-hidden": "true" }), t().minimize);

  const list = h("ul", { class: "transfers" });
  if (result.transfers.length === 0) {
    list.append(h("li", null, h("p", null, t().allSettled)));
  } else {
    for (const transfer of result.transfers) {
      list.append(h("li", null, renderSentence(transferParts(transfer, currency))));
    }
  }

  return h(
    "div",
    null,
    h("h3", null, t().settlement),
    label,
    h("p", { class: "hint" }, minimize ? t().minimizeHint : t().proportionalHint),
    list,
  );
}

/** Stays open while the summary re-renders. A fresh visit starts collapsed. */
let breakdownOpen = false;

function personalBlock(result: Settlement, currency: string, state: TripState): HTMLElement {
  const select = h("select", { id: "focus-player" });
  for (const [index, player] of state.players.entries()) {
    const choice = h("option", { value: player.id }, nameOf(player.name, index));
    choice.selected = player.id === state.focusId;
    select.append(choice);
  }
  const label = h("label", { class: "field" });
  label.append(h("span", { class: "label" }, t().showFor), select);

  const focus = result.balances.find((row) => row.id === state.focusId) ?? result.balances[0];
  const block = h("details", { class: "breakdown" });
  if (breakdownOpen) block.open = true;
  block.addEventListener("toggle", () => {
    breakdownOpen = block.open;
  });
  block.append(h("summary", null, t().breakdown), label);
  if (!focus) return block;

  block.append(
    h(
      "p",
      { class: "personal-balance" },
      t().balanceLine(
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
    list.append(h("li", null, h("p", null, t().nothingForMember)));
  } else {
    for (const transfer of mine) {
      const parts =
        transfer.fromId === focus.id
          ? t().youPay(transfer.toName, formatMoney(transfer.amount, currency))
          : t().youReceive(transfer.fromName, formatMoney(transfer.amount, currency));
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
      h("p", { class: "stat-label" }, t().totalSpent),
      h("p", { class: "stat-value" }, ltr(formatMoney(result.total, currency))),
    ),
    h(
      "div",
      { class: "stat" },
      h("p", { class: "stat-label" }, t().fairShare),
      h("p", { class: "stat-value" }, ltr(formatMoney(result.share, currency))),
      h("p", { class: "stat-note" }, t().each),
    ),
  );
}

function balanceTable(result: Settlement, currency: string, state: TripState): HTMLElement {
  const head = h("tr");
  for (const label of [t().memberColumn, t().entryType, t().weight, t().spent, t().entryShare, t().balance]) {
    head.append(h("th", { scope: "col" }, label));
  }
  const body = h("tbody");
  for (const row of result.balances) {
    const player = state.players.find((item) => item.id === row.id);
    const typeLabel = player && entryType(player) === "group" ? t().entryGroup : t().entryMember;
    const weight = player ? String(entryWeight(player)) : "1";
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
        h("td", null, typeLabel),
        moneyCell(weight),
        moneyCell(formatMoney(row.spent, currency)),
        moneyCell(formatMoney(row.share, currency)),
        balanceCell(formatSignedMoney(row.balance, currency), cents),
      ),
    );
  }
  const table = h(
    "table",
    { class: "balance" },
    h("caption", { class: "sr-only" }, t().balanceCaption),
    h("thead", null, head),
    body,
  );
  return h("div", { class: "table-wrap" }, table);
}

function transferParts(transfer: Transfer, currency: string): SentencePart[] {
  return t().pays(transfer.fromName, transfer.toName, formatMoney(transfer.amount, currency));
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
  cell.append(ltr(text));
  return cell;
}

function balanceCell(text: string, cents: number): HTMLTableCellElement {
  const cell = h("td");
  cell.append(ltr(text));
  cell.className = cents > 0 ? "pos" : cents < 0 ? "neg" : "zero";
  return cell;
}

function fillCurrencySelect(select: HTMLSelectElement, code: string): void {
  const resolved = resolveCurrency(code);
  const options: HTMLOptionElement[] = [];
  for (const choice of primaryCurrencies) options.push(currencyOption(choice.code, resolved));
  const separator = h("option", { disabled: "disabled", value: "" }, "────────");
  options.push(separator);
  for (const choice of otherCurrencies) options.push(currencyOption(choice.code, resolved));
  select.replaceChildren(...options);
  select.value = resolved;
  select.title = currencyName(resolved, uiLang);
}

/** Widen the native menu while it is open so the full currency names stay visible. */
function bindCurrencyMenu(select: HTMLSelectElement): void {
  const open = () => select.classList.add("is-open");
  select.addEventListener("pointerdown", open);
  select.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      open();
    }
  });
  select.addEventListener("blur", () => select.classList.remove("is-open"));
}

function currencyOption(code: string, selected: string): HTMLOptionElement {
  const option = h("option", { value: code }, currencyName(code, uiLang));
  option.selected = code === selected;
  return option;
}

function ltr(text: string): HTMLElement {
  const node = h("bdi", { dir: "ltr" });
  node.textContent = text;
  return node;
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

function applyLanguage(lang: Lang): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
}

function applyThemeChoice(choice: ThemeChoice): void {
  const dark = resolvedTheme(choice, window.matchMedia("(prefers-color-scheme: dark)").matches) === "dark";
  const root = document.documentElement;
  root.dataset.theme = choice;
  root.dataset.resolved = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
}

function appBar(choice: ThemeChoice): HTMLElement {
  const lang = h("select", { id: "lang", "aria-label": t().language });
  for (const option of [
    { value: "en", label: t().langEnglish },
    { value: "he", label: t().langHebrew },
    { value: "ru", label: t().langRussian },
  ]) {
    const node = h("option", { value: option.value }, option.label);
    node.selected = option.value === uiLang;
    lang.append(node);
  }
  const themeSelect = h("select", { id: "theme", "aria-label": t().theme });
  for (const option of [
    { value: "system", label: t().themeSystem },
    { value: "light", label: t().themeLight },
    { value: "dark", label: t().themeDark },
  ]) {
    const node = h("option", { value: option.value }, option.label);
    node.selected = option.value === choice;
    themeSelect.append(node);
  }
  const bar = h("div", { class: "app-bar" });
  bar.append(
    h(
      "div",
      { class: "app-bar-inner" },
      h("label", { class: "bar-field" }, h("span", null, t().language), lang),
      h("label", { class: "bar-field" }, h("span", null, t().theme), themeSelect),
    ),
  );
  return bar;
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
