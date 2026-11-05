import { ServiceError, UserError } from "./errors.js";
import { SYSTEM_LOCALS } from "./validate.js";

export const keyName = (local) => `gmail-${local}`;

function parseRule(rule, domain) {
  const matcher = rule.matchers?.find((item) => item.type === "literal" && item.field === "to");
  const address = matcher?.value?.toLowerCase();
  if (!address?.endsWith(`@${domain}`)) return null;

  const action = rule.actions?.[0];
  return {
    id: rule.id,
    name: rule.name || null,
    address,
    local: address.slice(0, -(domain.length + 1)),
    gmail: action?.type === "forward" ? (action.value?.[0]?.toLowerCase() ?? null) : null,
  };
}

const parseRules = (rules, domain) =>
  rules.map((rule) => parseRule(rule, domain)).filter(Boolean);

const isSystem = (rule) => SYSTEM_LOCALS.includes(rule.local);

function byLocal(left, right) {
  return left.local.localeCompare(right.local, "tr");
}

export async function loadOverview({ cf, resend, store, domain }) {
  const [rules, addresses, { keys, quota }, infoTargets, pending, log] = await Promise.all([
    cf.listRules(),
    cf.listAddresses(),
    resend.listKeys(),
    store.getInfoTargets(),
    store.getPending(),
    store.getLog(),
  ]);

  const parsed = parseRules(rules, domain);
  const people = parsed
    .filter((rule) => !isSystem(rule) && rule.gmail)
    .map((rule) => ({
      ...rule,
      name: rule.name ?? rule.local,
      key: keys.find((key) => key.name === keyName(rule.local)) ?? null,
      inInfo: infoTargets.includes(rule.gmail),
    }))
    .sort(byLocal);

  return {
    people,
    system: parsed.filter(isSystem).sort(byLocal),
    pending: pending.map((person) => ({
      ...person,
      verified: Boolean(addresses.find((item) => item.email.toLowerCase() === person.gmail)?.verified),
    })),
    infoTargets,
    quota,
    log,
  };
}

async function findPerson({ cf, domain }, local) {
  const parsed = parseRules(await cf.listRules(), domain);
  const person = parsed.find((rule) => rule.local === local);
  if (!person || isSystem(person) || !person.gmail) {
    throw new UserError(`${local}@${domain} panelden yönetilen bir kişi değil.`, 404);
  }
  return { person, others: parsed.filter((rule) => rule.local !== local) };
}

function gmailStillUsed(gmail, otherRules, pending) {
  return (
    otherRules.some((rule) => rule.gmail === gmail) ||
    pending.some((person) => person.gmail === gmail)
  );
}

async function deleteAddressOf({ cf }, gmail) {
  const address = (await cf.listAddresses()).find((item) => item.email.toLowerCase() === gmail);
  if (address) await cf.deleteAddress(address.id ?? address.tag);
}

export async function addPerson(deps, person) {
  const { cf, store, actor, domain } = deps;
  const address = `${person.local}@${domain}`;
  const [rules, pending] = await Promise.all([cf.listRules(), store.getPending()]);

  const taken =
    parseRules(rules, domain).some((rule) => rule.local === person.local) ||
    pending.some((item) => item.local === person.local);
  if (taken) throw new UserError(`${address} zaten var.`);

  const addresses = await cf.listAddresses();
  if (!addresses.some((item) => item.email.toLowerCase() === person.gmail)) {
    await cf.createAddress(person.gmail);
  }
  await store.setPending([...pending, person]);
  await store.addLog(actor, `${address} eklendi (${person.gmail}), doğrulama bekleniyor`);
}

export async function completePerson(deps, local) {
  const { cf, resend, store, actor, domain } = deps;
  const pending = await store.getPending();
  const person = pending.find((item) => item.local === local);
  if (!person) throw new UserError("Bekleyen kişi bulunamadı.", 404);
  const address = `${local}@${domain}`;

  const addresses = await cf.listAddresses();
  const verified = addresses.find((item) => item.email.toLowerCase() === person.gmail)?.verified;
  if (!verified) {
    throw new UserError(`${person.gmail} henüz doğrulanmadı. Kişi gelen maildeki bağlantıya tıklamalı.`);
  }

  // Yarıda kalırsa yeniden çalıştırılabilir: yapılmış adımlar atlanır.
  const rules = parseRules(await cf.listRules(), domain);
  if (!rules.some((rule) => rule.local === local)) {
    await cf.createRule({ name: person.name, address, gmail: person.gmail });
  }

  if (person.info) {
    const targets = await store.getInfoTargets();
    if (!targets.includes(person.gmail)) await store.setInfoTargets([...targets, person.gmail]);
  }

  const { keys } = await resend.listKeys();
  const token = keys.some((key) => key.name === keyName(local))
    ? null
    : await resend.createKey(keyName(local));

  await store.setPending(pending.filter((item) => item.local !== local));
  await store.addLog(actor, `${address} kurulumu tamamlandı`);
  return { ...person, address, token };
}

export async function cancelPending(deps, local) {
  const { cf, store, actor, domain } = deps;
  const pending = await store.getPending();
  const person = pending.find((item) => item.local === local);
  if (!person) throw new UserError("Bekleyen kişi bulunamadı.", 404);

  const remaining = pending.filter((item) => item.local !== local);
  await store.setPending(remaining);

  const [rules, targets] = await Promise.all([cf.listRules(), store.getInfoTargets()]);
  const used =
    gmailStillUsed(person.gmail, parseRules(rules, domain), remaining) ||
    targets.includes(person.gmail);
  if (!used) await deleteAddressOf(deps, person.gmail);

  await store.addLog(actor, `${local}@${domain} eklemesi iptal edildi`);
}

export async function removePerson(deps, local) {
  const { cf, resend, store, actor } = deps;
  const { person, others } = await findPerson(deps, local);
  const [pending, targets, { keys }] = await Promise.all([
    store.getPending(),
    store.getInfoTargets(),
    resend.listKeys(),
  ]);

  const used = gmailStillUsed(person.gmail, others, pending);
  const leavesInfo = !used && targets.includes(person.gmail);
  if (leavesInfo && targets.length === 1) {
    throw new UserError("Bu kişi info@ adresinin son alıcısı. Önce başka bir alıcı ekleyin.");
  }

  // Sıra önemli: kural en sona yakın silinir, çünkü kişi kuraldan bulunur.
  // Yarıda kalırsa kişi listede kalır ve işlem yeniden denenebilir.
  for (const key of keys.filter((item) => item.name === keyName(local))) {
    await resend.deleteKey(key.id);
  }
  if (leavesInfo) await store.setInfoTargets(targets.filter((gmail) => gmail !== person.gmail));
  await cf.deleteRule(person.id);

  if (!used) {
    try {
      await deleteAddressOf(deps, person.gmail);
    } catch (error) {
      // Kişi kapandı; kalan hedef adresin zararı yok.
      if (!(error instanceof ServiceError)) throw error;
    }
  }

  await store.addLog(actor, `${person.address} çıkarıldı`);
}

export async function setInfoRecipient(deps, local, enabled) {
  const { store, actor } = deps;
  const { person } = await findPerson(deps, local);
  const targets = await store.getInfoTargets();
  const present = targets.includes(person.gmail);
  if (present === enabled) return;

  if (!enabled && targets.length === 1) {
    throw new UserError("info@ adresinin son alıcısı çıkarılamaz.");
  }
  await store.setInfoTargets(
    enabled ? [...targets, person.gmail] : targets.filter((gmail) => gmail !== person.gmail),
  );
  await store.addLog(
    actor,
    `${person.address} ${enabled ? "info@ alıcılarına eklendi" : "info@ alıcılarından çıkarıldı"}`,
  );
}

export async function rotateKey(deps, local) {
  const { resend, store, actor } = deps;
  const { person } = await findPerson(deps, local);
  const [{ keys }, targets] = await Promise.all([resend.listKeys(), store.getInfoTargets()]);

  // Önce yenisi: üretim başarısız olursa eski anahtar çalışmaya devam eder.
  const token = await resend.createKey(keyName(local));
  for (const key of keys.filter((item) => item.name === keyName(local))) {
    await resend.deleteKey(key.id);
  }

  await store.addLog(actor, `${person.address} anahtarı yenilendi`);
  return { ...person, name: person.name ?? local, info: targets.includes(person.gmail), token };
}

export async function findPersonForConfirm(deps, local) {
  return (await findPerson(deps, local)).person;
}
