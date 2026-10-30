import { test } from "node:test";
import assert from "node:assert/strict";
import { countByStatus, isLeadStatus, leadLost, leadStatus, lostAndNew, type AdminLead } from "./leads.ts";

const lead = (p: Partial<AdminLead>): AdminLead => ({
  id: 1,
  ts: 0,
  when: "",
  name: "",
  phone: "+70000000000",
  total: 0,
  text: "",
  delivered: true,
  status: "new",
  statusWhen: null,
  ...p,
});

test("статус: только четыре известных, остальное — «новая»", () => {
  assert.ok(isLeadStatus("work"));
  assert.ok(!isLeadStatus("done"));
  assert.ok(!isLeadStatus(null));
  assert.equal(leadStatus("agreed"), "agreed");
  assert.equal(leadStatus("VIP"), "new");
  assert.equal(leadStatus(undefined), "new");
});

test("потерянная — не дошла в Telegram", () => {
  assert.equal(leadLost({ delivered: false }), true);
  assert.equal(leadLost({ delivered: true }), false);
});

test("наверху — только потерянные и ещё не взятые в работу", () => {
  const ls = [
    lead({ id: 1, delivered: false }),
    lead({ id: 2, delivered: false, status: "work" }),
    lead({ id: 3, delivered: true }),
  ];
  assert.deepEqual(lostAndNew(ls).map((l) => l.id), [1]);
});

test("счётчики по статусам", () => {
  const c = countByStatus([lead({}), lead({ status: "work" }), lead({ status: "work" }), lead({ status: "refused" })]);
  assert.deepEqual(c, { new: 1, work: 2, agreed: 0, refused: 1 });
});
