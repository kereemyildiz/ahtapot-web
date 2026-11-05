import { UserError } from "./errors.js";
import { PROTECTED_ADDRESSES } from "./validate.js";

export const keyName = (local) => `gmail-${local}`;

const COMPANY = "Ahtapot Tıbbi Teknolojiler";

const sameEmail = (left, right) => left.toLowerCase() === right.toLowerCase();

function parseRule(rule, domain, routes) {
  const matcher = rule.matchers?.find((item) => item.type === "literal" && item.field === "to");
  const address = matcher?.value?.toLowerCase();
  if (!address?.endsWith(`@${domain}`)) return null;

  const action = rule.actions?.[0];
  const forwarded = action?.type === "forward";
  return {
    id: rule.id,
    name: rule.name || null,
    address,
    local: address.slice(0, -(domain.length + 1)),
    recipients: forwarded ? [action.value[0].toLowerCase()] : (routes[address] ?? []),
    forwarded,
  };
}

async function readRules({ cf, store, domain }) {
  const [rules, routes] = await Promise.all([cf.listRules(), store.getRoutes()]);
  return rules.map((rule) => parseRule(rule, domain, routes)).filter(Boolean);
}

function findRule(rules, local, domain) {
  const rule = rules.find((item) => item.local === local);
  if (!rule) throw new UserError(`${local}@${domain} bulunamadı.`, 404);
  return rule;
}

// Tek alıcı kuralla doğrudan iletilir, birden fazlası Worker'dan geçer. Sıra önemli:
// Worker'a geçmeden önce liste KV'de olmalı, doğrudan iletime geçtikten sonra silinir.
async function saveRecipients({ cf, store, routerWorker }, rule, recipients) {
  const routes = await store.getRoutes();
  const target = { name: rule.name ?? "", address: rule.address };

  if (recipients.length === 1) {
    await cf.updateRule(rule.id, { ...target, gmail: recipients[0] });
    delete routes[rule.address];
    await store.setRoutes(routes);
    return;
  }

  routes[rule.address] = recipients;
  await store.setRoutes(routes);
  if (rule.forwarded) await cf.updateRule(rule.id, { ...target, worker: routerWorker });
}

// Gmail hiçbir adreste kalmadıysa Cloudflare'in hedef listesinden de kaldırılır.
async function dropUnusedDestination(deps, gmail) {
  const [rules, pending] = await Promise.all([readRules(deps), deps.store.getPending()]);
  const used =
    rules.some((rule) => rule.recipients.includes(gmail)) ||
    pending.some((item) => item.gmail === gmail);
  if (used) return;

  const destination = (await deps.cf.listAddresses()).find((item) => sameEmail(item.email, gmail));
  if (destination) await deps.cf.deleteAddress(destination.id ?? destination.tag);
}

async function ensureDestination({ cf }, gmail) {
  const addresses = await cf.listAddresses();
  const destination = addresses.find((item) => sameEmail(item.email, gmail));
  if (destination) return Boolean(destination.verified);
  await cf.createAddress(gmail);
  return false;
}

// Doğrulanan Gmail'ler alıcı olur. Panel her açıldığında çalışır, ayrı düğme gerekmez.
export async function applyVerifiedPending(deps) {
  const { cf, store, actor } = deps;
  const pending = await store.getPending();
  if (pending.length === 0) return;

  const addresses = await cf.listAddresses();
  const remaining = [];
  for (const item of pending) {
    const verified = addresses.find((entry) => sameEmail(entry.email, item.gmail))?.verified;
    if (!verified) {
      remaining.push(item);
      continue;
    }
    const rule = (await readRules(deps)).find((entry) => entry.local === item.local);
    if (!rule) {
      await cf.createRule({ name: item.name, address: item.address, gmail: item.gmail });
    } else if (!rule.recipients.includes(item.gmail)) {
      await saveRecipients(deps, rule, [...rule.recipients, item.gmail]);
    }
    await store.addLog(actor, `${item.gmail} doğrulandı, ${item.address} alıcısı oldu`);
  }
  if (remaining.length !== pending.length) await store.setPending(remaining);
}

export async function loadOverview(deps) {
  const { cf, resend, store, domain } = deps;
  const [rules, destinations, keys, pending, log, usage] = await Promise.all([
    readRules(deps),
    cf.listAddresses(),
    resend.listKeys(),
    store.getPending(),
    store.getLog(),
    resend.usage().catch(() => ({ daily: null, monthly: null })),
  ]);

  const keyOf = (local) => keys.find((key) => key.name === keyName(local)) ?? null;
  const keyHolders = rules.filter((rule) => keyOf(rule.local));

  const rows = rules.map((rule) => {
    const key = keyOf(rule.local);
    return {
      ...rule,
      recipients: [
        ...rule.recipients.map((email) => ({ email, waiting: false })),
        ...pending
          .filter((item) => item.local === rule.local)
          .map((item) => ({ email: item.gmail, waiting: true })),
      ],
      protectedReason: PROTECTED_ADDRESSES[rule.local] ?? null,
      key,
      // Anahtarı olmayan adresten alıcılar kendi anahtarıyla gönderebilir.
      sendsWithRecipientKeys:
        !key &&
        keyHolders.some((holder) => holder.recipients.some((gmail) => rule.recipients.includes(gmail))),
    };
  });

  const newAddresses = pending
    .filter((item) => !rules.some((rule) => rule.local === item.local))
    .map((item) => ({
      id: null,
      name: item.name,
      address: item.address,
      local: item.local,
      recipients: [{ email: item.gmail, waiting: true }],
      protectedReason: null,
      key: null,
      sendsWithRecipientKeys: false,
    }));

  return {
    rows: [...rows, ...newAddresses].sort((left, right) => left.local.localeCompare(right.local, "tr")),
    domain,
    destinations: destinations.filter((item) => item.verified).map((item) => item.email.toLowerCase()),
    usage,
    log,
  };
}

export async function addAddress(deps, { name, local, gmail }) {
  const { cf, store, actor, domain } = deps;
  const address = `${local}@${domain}`;
  const [rules, pending] = await Promise.all([readRules(deps), store.getPending()]);
  if (rules.some((rule) => rule.local === local) || pending.some((item) => item.local === local)) {
    throw new UserError(`${address} zaten var.`);
  }

  if (await ensureDestination(deps, gmail)) {
    await cf.createRule({ name, address, gmail });
    await store.addLog(actor, `${address} açıldı, alıcı ${gmail}`);
    return "acildi";
  }
  await store.setPending([...pending, { name, local, address, gmail }]);
  await store.addLog(actor, `${address} eklendi, ${gmail} doğrulaması bekleniyor`);
  return "dogrulama";
}

export async function addRecipient(deps, local, gmail) {
  const { store, actor, domain } = deps;
  const address = `${local}@${domain}`;
  const [rules, pending] = await Promise.all([readRules(deps), store.getPending()]);
  const rule = rules.find((item) => item.local === local);
  const entry = pending.find((item) => item.local === local);
  if (!rule && !entry) throw new UserError(`${address} bulunamadı.`, 404);

  const present =
    rule?.recipients.includes(gmail) ||
    pending.some((item) => item.local === local && item.gmail === gmail);
  if (present) throw new UserError(`${gmail} zaten ${address} alıcısı.`);

  const verified = await ensureDestination(deps, gmail);
  if (rule && verified) {
    await saveRecipients(deps, rule, [...rule.recipients, gmail]);
    await store.addLog(actor, `${gmail}, ${address} alıcısı oldu`);
    return "alici";
  }
  const name = rule?.name ?? entry?.name ?? "";
  await store.setPending([...pending, { name, local, address, gmail }]);
  await store.addLog(actor, `${gmail}, ${address} için doğrulama bekliyor`);
  return "dogrulama";
}

export async function removeRecipient(deps, local, gmail) {
  const { store, actor, domain } = deps;
  const address = `${local}@${domain}`;
  const pending = await store.getPending();

  if (pending.some((item) => item.local === local && item.gmail === gmail)) {
    await store.setPending(
      pending.filter((item) => !(item.local === local && item.gmail === gmail)),
    );
  } else {
    const rule = findRule(await readRules(deps), local, domain);
    if (!rule.recipients.includes(gmail)) throw new UserError(`${gmail} bu adresin alıcısı değil.`);
    if (rule.recipients.length === 1) {
      throw new UserError(`${address} adresinin son alıcısı çıkarılamaz. Adres gerekmiyorsa silin.`);
    }
    await saveRecipients(deps, rule, rule.recipients.filter((item) => item !== gmail));
  }

  await dropUnusedDestination(deps, gmail);
  await store.addLog(actor, `${gmail}, ${address} alıcılarından çıkarıldı`);
}

export async function deleteAddress(deps, local) {
  const { cf, resend, store, actor, domain } = deps;
  if (PROTECTED_ADDRESSES[local]) {
    throw new UserError(`${local}@${domain} silinemez: ${PROTECTED_ADDRESSES[local]}.`);
  }

  const rule = (await readRules(deps)).find((item) => item.local === local);
  const pending = await store.getPending();
  const waiting = pending.filter((item) => item.local === local);
  if (!rule && waiting.length === 0) throw new UserError(`${local}@${domain} bulunamadı.`, 404);

  // Sıra önemli: kural en son silinir, çünkü adres kuraldan bulunur.
  // Yarıda kalırsa adres listede kalır ve işlem yeniden denenebilir.
  const keys = await resend.listKeys();
  for (const key of keys.filter((item) => item.name === keyName(local))) {
    await resend.deleteKey(key.id);
  }
  if (rule) {
    await cf.deleteRule(rule.id);
    const routes = await store.getRoutes();
    if (routes[rule.address]) {
      delete routes[rule.address];
      await store.setRoutes(routes);
    }
  }
  await store.setPending(pending.filter((item) => item.local !== local));

  for (const gmail of [...(rule?.recipients ?? []), ...waiting.map((item) => item.gmail)]) {
    await dropUnusedDestination(deps, gmail);
  }
  await store.addLog(actor, `${local}@${domain} silindi`);
}

// Anahtar alan adına bağlıdır: alıcı, Gmail'ine gelen her adresten aynı anahtarla gönderebilir.
function sendingAddresses(rules, rule) {
  const related = rules.filter(
    (item) =>
      item.local === rule.local ||
      item.recipients.some((gmail) => rule.recipients.includes(gmail)),
  );
  return related.map((item) => {
    const shared = item.recipients.length > 1;
    return { address: item.address, name: item.name ?? (shared ? COMPANY : item.local), shared };
  });
}

export async function issueKey(deps, local) {
  const { resend, store, actor, domain } = deps;
  const rules = await readRules(deps);
  const rule = findRule(rules, local, domain);
  const keys = await resend.listKeys();

  // Önce yenisi: üretim başarısız olursa eski anahtar çalışmaya devam eder.
  const token = await resend.createKey(keyName(local));
  const old = keys.filter((item) => item.name === keyName(local));
  for (const key of old) await resend.deleteKey(key.id);

  await store.addLog(actor, `${rule.address} anahtarı ${old.length ? "yenilendi" : "üretildi"}`);
  return {
    address: rule.address,
    token,
    renewed: old.length > 0,
    sendAs: sendingAddresses(rules, rule),
  };
}

export async function findAddress(deps, local) {
  return findRule(await readRules(deps), local, deps.domain);
}
