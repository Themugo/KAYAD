// One e-mail comparison rule for invitations (and anything else that must decide "is this the same mailbox string").
// Same normalisation the registration flow applies (NFKC, trim, lower-case). It deliberately does NOT strip Gmail dots or "+tags":
// two different addresses are never assumed to be the same person.
export const normalizeEmail = (value) => String(value ?? "").normalize("NFKC").trim().toLowerCase();

export const emailsMatch = (a, b) => {
  const x = normalizeEmail(a);
  return x !== "" && x === normalizeEmail(b);
};

// "mugo.james27@gmail.com" -> "m***7@gmail.com": enough for a person to recognise their own address, not enough to harvest it.
export const maskEmail = (value) => {
  const e = normalizeEmail(value);
  const at = e.lastIndexOf("@");
  if (at < 1) return "";
  const local = e.slice(0, at);
  const shown = local.length <= 2 ? local[0] : `${local[0]}***${local.slice(-1)}`;
  return `${shown}${local.length <= 2 ? "***" : ""}@${e.slice(at + 1)}`;
};
